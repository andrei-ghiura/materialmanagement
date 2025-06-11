import { IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonItem, IonInput, IonTextarea, IonSelect, IonFooter, useIonAlert, IonCard, IonCardHeader, IonCardContent, IonSelectOption, IonLabel, IonPage, IonGrid, IonRow, IonCol, IonFab, IonFabButton } from "@ionic/react";
import QRious from "qrious";
import { Barcode, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { useEffect, useState } from "react";
import { deleteMaterial, getAll, save } from "../api/materials";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Capacitor } from '@capacitor/core';
import { useHistory, useParams } from 'react-router-dom';
import labels from '../labels';

const MaterialView = () => {
    const history = useHistory();
    const { id } = useParams<{ id: string }>();
    const [, setisSupported] = useState(false)
    const [barcodes, setBarcodes] = useState<Barcode[]>([]);
    const [presentAlert] = useIonAlert();
    const [componente, setComponente] = useState<string[]>([]);
    const [allMaterials, setAllMaterials] = useState<any[]>([]);
    const [material, setMaterial] = useState<any>({});
    useEffect(() => {
        BarcodeScanner.isSupported().then((result) => {
            setisSupported(result.supported);
        });
        getAll().then((materials) => {
            setAllMaterials(materials);
            const found = materials.find((m: any) => m.id === id);
            setMaterial(found || {});
            setComponente(found?.componente || []);
        });
    }, [id]);

    useEffect(() => {
        setBarcodes([]);
        setComponente(material.componente || []);
    }, [material]);

    const scan = async () => {
        const granted = await requestPermissions();
        if (!granted) {
            presentDenyAlert();
            return;
        }
        try {
            const { barcodes: scannedBarcodes } = await BarcodeScanner.scan();
            if (scannedBarcodes.length > 0) {
                const rawData = scannedBarcodes[0].displayValue || '';
                try {
                    const scannedData = JSON.parse(rawData.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''));
                    if (scannedData.id) {
                        setComponente(prev => [...prev, scannedData.id]);
                        const updatedMaterial = {
                            ...material,
                            componente: [...(componente || []), scannedData.id],
                        };
                        await save(updatedMaterial);
                        setMaterial(updatedMaterial);
                        alert('Componenta adaugata cu succes!');
                    } else {
                        alert('QR-ul nu contine un material valid.');
                    }
                } catch (parseError) {
                    alert('QR invalid.');
                }
            } else {
                alert('Niciun QR detectat.');
            }
        } catch (error) {
            alert('Eroare la scanare.');
        }
    }

    const requestPermissions = async (): Promise<boolean> => {
        const { camera } = await BarcodeScanner.requestPermissions();
        return camera === 'granted' || camera === 'limited';
    }

    const presentDenyAlert = async (): Promise<void> => {
        await presentAlert({
            header: 'Permission denied',
            message: 'Please grant camera permission to use the barcode scanner.',
            buttons: ['OK'],
        });
    }
    const requestStoragePermissions = async () => {
        if (Capacitor.getPlatform() === 'android') {
            const { Filesystem } = await import('@capacitor/filesystem');

            try {
                const permissionStatus = await Filesystem.checkPermissions();

                if (permissionStatus.publicStorage !== 'granted') {
                    const userConfirmed = await new Promise((resolve) => {
                        presentAlert({
                            header: 'Storage Permission Required',
                            message: 'This app needs storage permission to save files. Do you want to grant permission?',
                            buttons: [
                                {
                                    text: 'Cancel',
                                    role: 'cancel',
                                    handler: () => resolve(false),
                                },
                                {
                                    text: 'Grant',
                                    handler: () => resolve(true),
                                },
                            ],
                        });
                    });

                    if (!userConfirmed) {
                        throw new Error('Storage permission not granted');
                    }

                    const result = await Filesystem.requestPermissions();
                    if (result.publicStorage !== 'granted') {
                        throw new Error('Storage permission not granted');
                    }
                }
            } catch (error) {
                console.error('Error checking or requesting storage permissions:', error);
                throw error;
            }
        }
    };

    const downloadQRImage = async (canvas: HTMLCanvasElement, fileName: string) => {
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        await requestStoragePermissions();
        try {
            const validFileName = fileName || `QR_Code_${Date.now()}.png`;
            const directory = Directory.Documents;
            await Filesystem.writeFile({
                path: validFileName,
                data: base64Data,
                directory: directory,
                recursive: true,
            });
            alert('QR code saved successfully!');
        } catch (error) {
            console.error('Error saving QR code:', error);
            alert('Failed to save QR code. Please check permissions and storage availability.');
        }
    };

    const makeQR = (your_data: string) => {
        const qrcodeContainer = document.getElementById("qrcode");
        if (!qrcodeContainer) return;
        qrcodeContainer.innerHTML = "";
        const qrSize = 300;
        const tableWidth = 450;
        const rowHeight = 40;
        const padding = 30;
        const parsedData = JSON.parse(your_data);
        const tableData = Object.entries(parsedData);
        // Prepare components table data
        const components = (parsedData.componente || []).map((compId: string) => {
            const comp = allMaterials.find((m) => m.id === compId);
            return comp ? [comp.id, comp.nume, comp.tip, comp.stare] : [compId, '', '', ''];
        });
        const componentsTableHeaders = ["ID", "Nume", "Tip", "Stare"];
        // Calculate canvas height to fit QR, details, and components table
        const componentsTableHeight = (components.length + 1) * 32 + 20;
        const detailsHeight = tableData.length * rowHeight + 2 * padding;
        const canvasHeight = Math.max(qrSize + 2 * padding, detailsHeight) + componentsTableHeight;
        const canvasWidth = qrSize + tableWidth + 3 * padding;
        const qrCanvas = document.createElement('canvas');
        qrCanvas.width = canvasWidth;
        qrCanvas.height = canvasHeight;
        const context = qrCanvas.getContext('2d');
        if (!context) return;
        context.fillStyle = "white";
        context.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
        const qrTempCanvas = document.createElement('canvas');
        new QRious({
            element: qrTempCanvas,
            value: your_data,
            size: qrSize,
            padding: 0,
        });
        context.drawImage(qrTempCanvas, padding, (canvasHeight - qrSize - componentsTableHeight) / 2, qrSize, qrSize);
        context.fillStyle = "black";
        context.font = "20px Arial";
        let yPosition = padding + 30;
        const startX = qrSize + 2 * padding;
        context.font = "bold 22px Arial";
        context.fillText("Material Details", startX, yPosition);
        yPosition += rowHeight;
        context.font = "20px Arial";
        tableData.filter(([key, value]) => key == 'id' || key == 'nume').forEach(([key, value]) => {
            context.fillText(`${key}:`, startX, yPosition);
            context.fillText(`${value}`, startX + 150, yPosition);
            yPosition += rowHeight;
        });
        // Draw components table
        yPosition += 10;
        context.font = "bold 20px Arial";
        context.fillText("Componente", startX, yPosition);
        yPosition += 32;
        context.font = "bold 16px Arial";
        componentsTableHeaders.forEach((header, i) => {
            if (i > 1) return

            context.fillText(header, startX + i * 110, yPosition);
        });
        yPosition += 28;
        context.font = "16px Arial";
        components.forEach((row) => {
            row.forEach((cell, i) => {
                if (i === 0) {
                    context.fillStyle = "#007bff"; // Blue for ID
                } else {
                    context.fillStyle = "black"; // Default color for other cells
                }
                if (i === 0) {
                    context.font = "bold 16px Arial"; // Bold for ID
                } else {
                    context.font = "16px Arial"; // Regular for other cells
                }
                if (i > 1) return
                context.fillText(cell, startX + i * 110, yPosition);
            });
            yPosition += 28;
        });
        qrcodeContainer.appendChild(qrCanvas);
        downloadQRImage(qrCanvas, `${parsedData.id || parsedData.nume || 'material'}_${parsedData.tip || 'qr'}.png`);
    }

    const handleConfirm = async () => {
        try {
            const updatedMaterial = {
                ...material,
                componente: componente,
            };
            await save(updatedMaterial);
            setMaterial(updatedMaterial);
            alert('Material salvat cu succes!');
        } catch (error) {
            alert('Eroare la salvare.');
        }
    };

    if (!material) return null;

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton fill="clear" onClick={() => history.goBack()}>
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
            <IonContent className="ion-padding" style={{ background: '#f6f8fa' }}>
                <IonGrid>
                    <IonRow>
                        <IonCol size="12" sizeMd="8" offsetMd="2">
                            <IonCard style={{ boxShadow: '0 2px 12px #0001', borderRadius: 16 }}>
                                <IonCardHeader style={{ fontSize: 22, fontWeight: 700, borderBottom: '1px solid #eee' }}>
                                    {labels.detaliiMaterial}
                                </IonCardHeader>
                                <IonCardContent>
                                    <IonItem lines="none">
                                        <IonInput
                                            label={labels.nume}
                                            value={material.nume}
                                            onIonInput={(ev) => setMaterial({ ...material, nume: ev.target.value })}
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
                                            onIonInput={(ev) => setMaterial({ ...material, descriere: ev.target.value })}
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
                                </IonCardContent>
                            </IonCard>
                            <IonCard >
                                <IonCardHeader>
                                    {labels.componente}
                                </IonCardHeader>
                                <IonCardContent>
                                    {componente?.length === 0 && (
                                        <IonLabel color="medium">Nicio componenta adaugata.</IonLabel>
                                    )}
                                    {componente?.map((compId: string, index: number) => {
                                        const comp = allMaterials.find((m) => m.id === compId);
                                        return (
                                            <IonItem button detail={true} key={index} onClick={() => history.push(`/material/${compId}`)} lines="full" >
                                                <IonLabel>
                                                    <h3 style={{ margin: 0 }}>{comp?.nume || compId}</h3>
                                                    <p style={{ margin: 0 }}>{comp?.tip || ''}</p>
                                                    <span style={{ fontSize: 13 }}>{comp?.descriere || ''}</span>
                                                </IonLabel>
                                            </IonItem>
                                        );
                                    })}
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                                        <IonButton color="primary" shape="round" onClick={scan}>
                                            <span style={{ fontWeight: 600 }}>{labels.adaugaComponenta}</span>
                                        </IonButton>
                                    </div>
                                </IonCardContent>
                            </IonCard>
                            <div id="qrcode" style={{ marginTop: 32, textAlign: 'center', overflowX: 'auto', whiteSpace: 'nowrap' }}></div>
                        </IonCol>
                    </IonRow>
                </IonGrid>
                <IonFab vertical="bottom" horizontal="end" slot="fixed">
                    <IonFabButton color="tertiary" onClick={() => makeQR(JSON.stringify(material))}>
                        <span style={{ fontSize: 22 }}>⎙</span>
                    </IonFabButton>
                </IonFab>
            </IonContent>
            <IonFooter>
                <IonToolbar>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 8 }}>
                        <IonButton color="danger" onClick={() => {
                            deleteMaterial(material).then(() => {
                                history.goBack();
                            })
                        }}>
                            {labels.sterge}
                        </IonButton>
                        <IonButton color="medium" onClick={() => history.push(`/material/${material.id}/components`)}>
                            Vezi toate componentele
                        </IonButton>
                    </div>
                </IonToolbar>
            </IonFooter>
        </IonPage>
    );
}
export default MaterialView;
