import { IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonItem, IonInput, IonTextarea, IonSelect, IonFooter, useIonAlert, IonLabel, IonPage, IonGrid, IonRow, IonCol, IonSelectOption } from "@ionic/react";
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
// @ts-ignore
import { Html5Qrcode } from 'html5-qrcode';

const isWeb = () => {
    return !(window as any).Capacitor?.isNativePlatform?.();
};

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
    const [pendingNavigation, setPendingNavigation] = useState<null | (() => void)>(null);
    const [unsaved, setUnsaved] = useState(false);
    const initialMaterialRef = useRef<Material | null>(null);
    const [showWebQrModal, setShowWebQrModal] = useState(false);
    const webQrRef = useRef<HTMLDivElement>(null);
    const html5QrInstance = useRef<any>(null);

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
        if (isWeb()) {
            setShowWebQrModal(true);
            return;
        }
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

    // Web QR code scan handler
    useEffect(() => {
        if (showWebQrModal && webQrRef.current) {
            if (!html5QrInstance.current) {
                html5QrInstance.current = new Html5Qrcode(webQrRef.current.id);
            }
            html5QrInstance.current
                .start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: 250 },
                    async (decodedText: string) => {
                        html5QrInstance.current.stop();
                        setShowWebQrModal(false);
                        let scannedData: any = {};
                        try {
                            scannedData = JSON.parse(decodedText);
                        } catch {
                            scannedData = { id: decodedText.trim() };
                        }
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
                    },
                    (errorMessage: string) => {
                        // ignore errors
                    }
                )
                .catch(() => { });
        }
        return () => {
            if (html5QrInstance.current) {
                html5QrInstance.current.stop().catch(() => { });
            }
        };
    }, [showWebQrModal]);

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

    const closeWebQrModal = async () => {
        setShowWebQrModal(false);
        if (html5QrInstance.current) {
            try {
                await html5QrInstance.current.stop();
            } catch (e) {
                // Ignore errors if scanner is not running
            }
            html5QrInstance.current = null;
        }
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
            <IonContent className="ion-padding-condensed bg-[#f6f8fa] min-h-screen">
                <IonGrid>
                    <IonRow className="ion-justify-content-center">
                        {/* Left Column: Material Details */}
                        <IonCol size="12" size-lg="6" className="flex flex-col px-2 py-1"> {/* MODIFIED: Removed IonCard, added padding to IonCol */}
                            <div className="bg-white rounded-lg shadow p-3 mb-2 flex-grow"> {/* MODIFIED: Added a div with styling to replace IonCard visual */}
                                <h3 className="text-xl font-bold mb-2">{labels.detaliiMaterial}</h3> {/* MODIFIED: Adjusted margin */}
                                <IonItem lines="none" className="py-0 min-h-[auto]">
                                    <IonInput
                                        label={labels.nume}
                                        value={material.nume}
                                        onIonInput={(ev) => setMaterial({ ...material, nume: ev.target.value as string || '' })}
                                        labelPlacement="stacked"
                                        type="text"
                                    />
                                </IonItem>
                                <IonItem lines="none" className="py-0 min-h-[auto]">
                                    <IonSelect value={material.tip} label={labels.tip} onIonChange={(ev) => setMaterial({ ...material, tip: ev.detail.value })} interfaceOptions={{ className: 'compact-select-interface' }} > {/* MODIFIED: Added interfaceOptions for custom styling if needed, or rely on item padding */}
                                        <IonSelectOption value="Materie prima">Materie prima</IonSelectOption>
                                        <IonSelectOption value="Material prelucrat">Material prelucrat</IonSelectOption>
                                    </IonSelect>
                                </IonItem>
                                <IonItem lines="none" className="py-0 min-h-[auto]">
                                    <IonTextarea
                                        label={labels.descriere}
                                        value={material.descriere}
                                        onIonInput={(ev) => setMaterial({ ...material, descriere: ev.target.value || '' })}
                                        labelPlacement="stacked"
                                        placeholder="Descriere material, detalii, etc."
                                        rows={3} /* MODIFIED: Reduced rows from 4 to 3 */
                                    />
                                </IonItem>
                                <IonItem lines="none" className="py-0 min-h-[auto]">
                                    <IonSelect value={material.stare} label={labels.stare} onIonChange={(ev) => setMaterial({ ...material, stare: ev.detail.value })} interfaceOptions={{ className: 'compact-select-interface' }} > {/* MODIFIED: Added interfaceOptions */}
                                        <IonSelectOption value="Receptionat">Receptionat</IonSelectOption>
                                        <IonSelectOption value="In lucru">In lucru</IonSelectOption>
                                        <IonSelectOption value="Livrat">Livrat</IonSelectOption>
                                    </IonSelect>
                                </IonItem>
                            </div>
                        </IonCol>

                        {/* Right Column: Components and QR Code */}
                        <IonCol size="12" size-lg="6" className="flex flex-col px-2 py-1"> {/* MODIFIED: Removed IonCard, added padding to IonCol */}
                            <div className="bg-white rounded-lg shadow p-3 mb-2"> {/* MODIFIED: Added a div with styling to replace IonCard visual */}
                                <h3 className="text-lg font-semibold mb-2">{labels.componente}</h3> {/* MODIFIED: Adjusted margin */}
                                {componente?.length === 0 ? (
                                    <IonLabel color="medium">Nicio componenta adaugata.</IonLabel>
                                ) : (
                                    componente.map((compId: string, index: number) => {
                                        const comp = allMaterials.find((m) => m.id === compId);
                                        return (
                                            <IonItem button detail key={index} onClick={() => history.push(`/material/${compId}`)} lines="full" className="py-1 min-h-[auto]">
                                                <IonLabel>
                                                    <h3 className="m-0 text-sm">{compId}</h3>
                                                    <p className="m-0 text-xs">{comp?.nume || ''}</p>
                                                </IonLabel>
                                            </IonItem>
                                        );
                                    })
                                )}
                                <div className="flex justify-center mt-2 mb-1">
                                    <IonButton color="primary" shape="round" onClick={scan} size="small">
                                        <span className="font-semibold">{labels.adaugaComponenta}</span>
                                    </IonButton>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow p-3 mb-2"> {/* MODIFIED: Added a div with styling to replace IonCard visual */}
                                <h3 className="text-lg font-semibold mb-2">Etichetă QR</h3> {/* MODIFIED: Adjusted margin */}
                                <div
                                    id="qrcode"
                                    className="mt-2 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl text-center flex justify-center items-center flex-col gap-2" // MODIFIED: Reduced gap and mt
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
                            </div>
                        </IonCol>
                    </IonRow>
                </IonGrid>
            </IonContent>
            <IonFooter>
                <IonToolbar className="py-0 min-h-[auto]">
                    <IonButtons slot="start">
                        <IonButton color="danger" onClick={handleDelete} size="small">
                            <span className="text-lg mr-1" role="img" aria-label="delete">🗑️</span>
                            Șterge
                        </IonButton>
                        <IonButton color="tertiary" onClick={handleDownload} size="small">
                            <span className="text-lg mr-1" role="img" aria-label="print">⎙</span>
                            QR
                        </IonButton>
                    </IonButtons>
                    <IonButtons slot="end">
                        <IonButton color="medium" onClick={() => handleNav(() => history.push(`/material/${material.id}/components`))} size="small">
                            Export
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonFooter>
            {/* Web QR Modal */}
            {showWebQrModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                    }}
                >
                    <div
                        id="web-qr-reader"
                        ref={webQrRef}
                        style={{ width: 300, height: 300, background: '#000' }}
                    ></div>
                    <IonButton color="danger" onClick={closeWebQrModal}>
                        Închide
                    </IonButton>
                </div>
            )}
        </IonPage>
    );
}
export default MaterialView;
