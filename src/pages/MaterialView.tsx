import { IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonItem, IonInput, IonTextarea, IonSelect, IonFooter, useIonAlert, IonCard, IonCardHeader, IonCardContent, IonSelectOption, IonLabel, IonPage, IonGrid, IonRow, IonCol, IonFab, IonFabButton } from "@ionic/react";
import QRious from "qrious";
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { useEffect, useState, useRef } from "react";
import { Prompt } from 'react-router-dom';
import { deleteMaterial, getAll, save } from "../api/materials";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Capacitor } from '@capacitor/core';
import { useHistory, useParams } from 'react-router-dom';
import labels from '../labels';
import { Material } from "../types";
import { makeLabelCanvas } from "../components/makeLabelCanvas";



const MaterialView = () => {
    const history = useHistory();
    const { id } = useParams<{ id: string }>();
    const [presentAlert] = useIonAlert();
    const [componente, setComponente] = useState<string[]>([]);
    const [allMaterials, setAllMaterials] = useState<Material[]>([]);
    const [material, setMaterial] = useState<Material>({
        id: '',
        nume: '',
        tip: '',
        stare: '',
        descriere: '',
        createdAt: '',
        updatedAt: '',
        componente: [],
    });
    const [labelImageUrl, setLabelImageUrl] = useState("");
    const labelCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<null | (() => void)>(null);
    const [unsaved, setUnsaved] = useState(false);
    const initialMaterialRef = useRef<Material | null>(null);

    useEffect(() => {
        getAll().then((materials) => {
            setAllMaterials(materials);
            const found = materials.find((m: Material) => m.id === id);
            setMaterial(found || {});
            setComponente(found?.componente || []);
            initialMaterialRef.current = found || null;
        });
    }, [id]);

    // Track unsaved changes
    useEffect(() => {
        if (!initialMaterialRef.current) return;
        const isChanged = JSON.stringify({ ...material, componente }) !== JSON.stringify({ ...initialMaterialRef.current, componente: initialMaterialRef.current.componente });
        setUnsaved(isChanged);
    }, [material, componente]);

    // Intercept browser back/refresh
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (unsaved) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [unsaved]);

    // Intercept in-app navigation
    const handleNav = (navFn: () => void) => {
        if (unsaved) {
            setPendingNavigation(() => navFn);
            handleLeaveConfirm();
        } else {
            navFn();
        }
    }

    useEffect(() => {
        setComponente(material.componente || []);
    }, [material]);

    // Generate label image when material or material.id changes
    useEffect(() => {
        if (!material || !material.id) return;
        (async () => {
            const canvas = await makeLabelCanvas(material.id);
            if (canvas) {
                labelCanvasRef.current = canvas;
                setLabelImageUrl(canvas.toDataURL("image/png"));
            }
        })();
    }, [material]);

    const scan = async () => {
        try {
            const { barcodes } = await BarcodeScanner.scan();
            const rawData = barcodes[0]?.displayValue || '';
            const scannedData = JSON.parse(rawData);
            if (scannedData.id) {
                const updated = {
                    ...material,
                    componente: [...(componente || []), scannedData.id],
                };
                await save(updated);
                setMaterial(updated);
                alert('Componenta adaugata cu succes!');
            } else {
                alert('QR-ul nu contine un material valid.');
            }
        } catch {
            alert('Eroare la scanare.');
        }
    }

    const downloadQRImage = async (canvas: HTMLCanvasElement, fileName: string) => {
        const dataUrl = canvas.toDataURL('image/png');

        if (Capacitor.getPlatform() === 'web') {
            // For web platform, create a download link
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // For native platforms (Android), use Filesystem API
            const base64Data = dataUrl.split(',')[1];
            await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Documents,
                recursive: true,
            });
            alert('QR code saved successfully!');
        }
    };

    const handleConfirm = async () => {
        await save({ ...material, componente });
        setUnsaved(false);
        if (pendingNavigation) {
            setShowLeaveConfirm(false);
            const nav = pendingNavigation;
            setPendingNavigation(null);
            nav();
        } else {
            alert('Material salvat cu succes!');
            history.push('/');
        }
    };
    const handleDownload = () => {
        if (labelCanvasRef.current) {
            const fileName = `${material.id || material.nume || 'material'}_${new Date().toISOString().split('.')[0].replace(/[:-]/g, '_')}.png`;
            downloadQRImage(labelCanvasRef.current, fileName);
        }
    };
    if (!material) return null;

    // Delete confirmation using presentAlert
    const handleDelete = () => {
        presentAlert({
            header: 'Confirmare ștergere',
            message: 'Sigur vrei să ștergi acest material?',
            buttons: [
                {
                    text: 'Anulează',
                    role: 'cancel',
                },
                {
                    text: 'Da, șterge materialul',
                    role: 'destructive',
                    handler: async () => {
                        await deleteMaterial(material);
                        history.goBack();
                    },
                },
            ],
        });
    };

    // Leave confirmation using presentAlert
    const handleLeaveConfirm = () => {
        presentAlert({
            header: 'Modificări nesalvate',
            message: 'Ai modificări nesalvate. Ce vrei să faci?',
            buttons: [
                {
                    text: 'Rămâi pe pagină',
                    role: 'cancel',
                },
                {
                    text: 'Părăsește fără salvare',
                    role: 'destructive',
                    handler: () => {
                        setUnsaved(false);
                        if (pendingNavigation) {
                            const nav = pendingNavigation;
                            setPendingNavigation(null);
                            nav();
                        }
                    },
                },
                {
                    text: 'Salvează și pleacă',
                    handler: async () => {
                        await handleConfirm();
                    },
                },
            ],
        });
    };

    return (
        <IonPage>
            {/* Prompt for browser navigation (react-router-dom v5) */}
            {unsaved && <Prompt when={unsaved} message={() => false} />}
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton fill="clear" onClick={() => handleNav(() => history.goBack())}>
                            <span style={{ fontSize: 20 }}>←</span>
                        </IonButton>
                    </IonButtons>
                    <IonTitle>{labels.detaliiMaterial}</IonTitle>
                    <IonButtons slot="end">
                        <IonButton color="success" onClick={handleConfirm}>
                            <span style={{ fontWeight: 600 }}>{labels.confirm}</span>
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding bg-[#f6f8fa] min-h-screen pb-20">
                <div className="flex flex-col items-center w-full">
                    <div className="flex flex-col flex-wrap w-full max-w-[480px] gap-6 material-flex-container md:flex-row md:max-w-[1100px] md:gap-10 md:items-start xl:max-w-[1600px] xl:gap-16 xl:py-8">
                        <IonCard className="mb-0 min-w-[45%]">
                            <h2 className="text-[22px] font-bold mt-4 mb-2 pl-3 pt-2">{labels.detaliiMaterial}</h2>
                            <div className="bg-transparent rounded-none p-3 shadow-none">
                                <IonItem lines="none">
                                    <IonInput
                                        label={labels.nume}
                                        value={material.nume}
                                        onIonInput={(ev) => setMaterial({ ...material, nume: ev.target.value as string || '' })}
                                        labelPlacement="stacked"
                                        type="text"
                                    />
                                </IonItem>
                                <IonItem lines="none">
                                    <IonSelect value={material.tip} label={labels.tip} onIonChange={(ev) => setMaterial({ ...material, tip: ev.detail.value })}>
                                        <IonSelectOption value="Materie prima">Materie prima</IonSelectOption>
                                        <IonSelectOption value="Material prelucrat">Material prelucrat</IonSelectOption>
                                    </IonSelect>
                                </IonItem>
                                <IonItem lines="none">
                                    <IonTextarea
                                        label={labels.descriere}
                                        value={material.descriere}
                                        onIonInput={(ev) => setMaterial({ ...material, descriere: ev.target.value || '' })}
                                        labelPlacement="stacked"
                                        placeholder="Descriere material, detalii, etc."
                                        rows={4}
                                    />
                                </IonItem>
                                <IonItem lines="none">
                                    <IonSelect value={material.stare} label={labels.stare} onIonChange={(ev) => setMaterial({ ...material, stare: ev.detail.value })}>
                                        <IonSelectOption value="Receptionat">Receptionat</IonSelectOption>
                                        <IonSelectOption value="In lucru">In lucru</IonSelectOption>
                                        <IonSelectOption value="Livrat">Livrat</IonSelectOption>
                                    </IonSelect>
                                </IonItem>
                            </div>
                        </IonCard>
                        <IonCard className="mb-0 min-w-[45%]">
                            <h3 className="text-[18px] font-semibold mt-4 mb-2 pl-3 pt-2">{labels.componente}</h3>
                            <div className="bg-transparent rounded-none p-3 shadow-none">
                                {componente?.length === 0 ? (
                                    <IonLabel color="medium">Nicio componenta adaugata.</IonLabel>
                                ) : (
                                    componente.map((compId: string, index: number) => {
                                        const comp = allMaterials.find((m) => m.id === compId);
                                        return (
                                            <IonItem button detail key={index} onClick={() => history.push(`/material/${compId}`)} lines="full" >
                                                <IonLabel>
                                                    <h3 className="m-0">{compId}</h3>
                                                    <p className="m-0">{comp?.nume || ''}</p>
                                                </IonLabel>
                                            </IonItem>
                                        );
                                    })
                                )}
                                <div className="flex justify-center mt-4">
                                    <IonButton color="primary" shape="round" onClick={scan}>
                                        <span className="font-semibold">{labels.adaugaComponenta}</span>
                                    </IonButton>
                                </div>
                            </div>
                        </IonCard>
                        <IonCard className="mb-0 min-w-[45%]">
                            <div
                                id="qrcode"
                                className="mt-6 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl text-center flex justify-center items-center flex-col gap-4"
                                style={{ width: '100%' }}
                            >
                                {labelImageUrl && (
                                    <img
                                        src={labelImageUrl}
                                        alt="Printable label"
                                        className="w-full h-auto max-w-full border border-gray-300 rounded-lg object-contain"
                                        style={{ maxWidth: '100%', height: 'auto' }}
                                    />
                                )}
                            </div>
                        </IonCard>
                    </div>
                </div>
            </IonContent>
            <IonFooter>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton color="danger" onClick={handleDelete}>
                            <span className="text-xl" role="img" aria-label="delete">🗑️</span>
                            Șterge
                        </IonButton>
                        <IonButton color="tertiary" onClick={handleDownload}>
                            <span style={{ fontSize: 22 }} role="img" aria-label="print">⎙</span>
                            QR
                        </IonButton>
                    </IonButtons>
                    <IonButtons slot="end">
                        <IonButton color="medium" onClick={() => handleNav(() => history.push(`/material/${material.id}/components`))}>
                            Export
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonFooter>
        </IonPage>
    );
}
export default MaterialView;
