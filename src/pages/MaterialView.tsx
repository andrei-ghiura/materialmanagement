import { IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonItem, IonInput, IonTextarea, IonSelect, IonFooter, useIonAlert, IonCard, IonCardHeader, IonCardContent, IonSelectOption, IonLabel, IonPage, IonGrid, IonRow, IonCol, IonFab, IonFabButton } from "@ionic/react";
import { QRious } from "react-qrious";
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { useEffect, useState } from "react";
import { deleteMaterial, getAll, save } from "../api/materials";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Capacitor } from '@capacitor/core';
import { useHistory, useParams } from 'react-router-dom';
import labels from '../labels';
import { Material } from "../types";



const MaterialView = () => {
    const history = useHistory();
    const { id } = useParams<{ id: string }>();
    const [, setisSupported] = useState(false)
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
    useEffect(() => {
        BarcodeScanner.isSupported().then((result) => {
            setisSupported(result.supported);
        });
        getAll().then((materials) => {
            setAllMaterials(materials);
            const found = materials.find((m: Material) => m.id === id);
            setMaterial(found || {});
            setComponente(found?.componente || []);
        });
    }, [id]);

    useEffect(() => {
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
                    const scannedData = JSON.parse(rawData);
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
                } catch {
                    alert('QR invalid.');
                }
            } else {
                alert('Niciun QR detectat.');
            }
        } catch {
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

        if (Capacitor.getPlatform() === 'web') {
            // For web platform, create a download link
            const link = document.createElement('a');
            link.download = fileName || `QR_Code_${Date.now()}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // For native platforms (Android), use Filesystem API
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
        }
    };

    const makeQR = (your_data: string) => {
        const qrcodeContainer = document.getElementById("qrcode");
        if (!qrcodeContainer) return;

        // Vertical label layout constants
        const labelWidth = 420;
        const labelHeight = 540;
        const borderRadius = 16;
        const borderColor = '#22223b';
        const borderWidth = 5;
        const headerHeight = 56;
        const padding = 28;
        const qrSize = 160;
        const accentColor = '#1e293b';
        const headerBg = '#fbbf24';
        const headerText = '#22223b';
        const tableHeaderBg = '#e5e7eb';
        const tableHeaderColor = '#1e293b';
        const tableBorder = '#cbd5e1';
        const tableFont = 'bold 15px Arial';
        const tableHeaderFont = 'bold 15px Arial';
        const highlightBg = '#fef9c3';
        const sectionTitleFont = 'bold 16px Arial';
        const tableColWidths = [70, 120, 90, 70];
        const tableRowHeight = 36;

        // Parse data and prepare components
        const parsedData = JSON.parse(your_data);
        const components = (parsedData.componente || []).map((compId: string) => {
            const comp = allMaterials.find((m) => m.id === compId);
            return comp ? [comp.id, comp.nume, comp.tip, comp.stare] : [compId, '', '', ''];
        });

        // Canvas
        const canvas = document.createElement('canvas');
        canvas.width = labelWidth;
        canvas.height = labelHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Card background and border
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(borderRadius, 0);
        ctx.lineTo(labelWidth - borderRadius, 0);
        ctx.quadraticCurveTo(labelWidth, 0, labelWidth, borderRadius);
        ctx.lineTo(labelWidth, labelHeight - borderRadius);
        ctx.quadraticCurveTo(labelWidth, labelHeight, labelWidth - borderRadius, labelHeight);
        ctx.lineTo(borderRadius, labelHeight);
        ctx.quadraticCurveTo(0, labelHeight, 0, labelHeight - borderRadius);
        ctx.lineTo(0, borderRadius);
        ctx.quadraticCurveTo(0, 0, borderRadius, 0);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = borderColor;
        ctx.stroke();

        // Header bar (title: name and id)
        ctx.fillStyle = headerBg;
        ctx.fillRect(0, 0, labelWidth, headerHeight);
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = headerText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${parsedData.nume || ''} (${parsedData.id || ''})`, labelWidth / 2, headerHeight / 2);

        // QR code centered
        const qrTempCanvas = document.createElement('canvas');
        new QRious({
            element: qrTempCanvas,
            value: your_data,
            size: qrSize,
            background: 'transparent',
            padding: 0,
        });
        // Draw white rounded rect behind QR
        ctx.save();
        ctx.fillStyle = '#fff';
        const qrX = (labelWidth - qrSize) / 2;
        const qrY = headerHeight + 32;
        const qrBgRadius = 16;
        ctx.beginPath();
        ctx.moveTo(qrX + qrBgRadius, qrY);
        ctx.lineTo(qrX + qrSize - qrBgRadius, qrY);
        ctx.quadraticCurveTo(qrX + qrSize, qrY, qrX + qrSize, qrY + qrBgRadius);
        ctx.lineTo(qrX + qrSize, qrY + qrSize - qrBgRadius);
        ctx.quadraticCurveTo(qrX + qrSize, qrY + qrSize, qrX + qrSize - qrBgRadius, qrY + qrSize);
        ctx.lineTo(qrX + qrBgRadius, qrY + qrSize);
        ctx.quadraticCurveTo(qrX, qrY + qrSize, qrX, qrY + qrSize - qrBgRadius);
        ctx.lineTo(qrX, qrY + qrBgRadius);
        ctx.quadraticCurveTo(qrX, qrY, qrX + qrBgRadius, qrY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.drawImage(qrTempCanvas, qrX, qrY, qrSize, qrSize);

        // Components table section
        let tableY = qrY + qrSize + 32;
        ctx.font = sectionTitleFont;
        ctx.fillStyle = accentColor;
        ctx.textAlign = 'left';
        ctx.fillText('Components', padding, tableY);
        tableY += 10;
        // Table header
        ctx.font = tableHeaderFont;
        ctx.textAlign = 'center';
        let colX = padding;
        ['ID', 'Name', 'Type', 'Status'].forEach((header, i) => {
            ctx.fillStyle = tableHeaderBg;
            ctx.fillRect(colX, tableY, tableColWidths[i], tableRowHeight);
            ctx.strokeStyle = tableBorder;
            ctx.strokeRect(colX, tableY, tableColWidths[i], tableRowHeight);
            ctx.fillStyle = tableHeaderColor;
            ctx.fillText(header, colX + tableColWidths[i] / 2, tableY + tableRowHeight / 2 + 2);
            colX += tableColWidths[i];
        });
        tableY += tableRowHeight;
        // Table rows
        ctx.font = tableFont;
        if (components.length > 0) {
            components.forEach((row, idx) => {
                colX = padding;
                if (idx % 2 === 0) {
                    ctx.fillStyle = highlightBg;
                    ctx.fillRect(colX, tableY, tableColWidths.reduce((a, b) => a + b, 0), tableRowHeight);
                }
                row.forEach((cell, i) => {
                    ctx.strokeStyle = tableBorder;
                    ctx.strokeRect(colX, tableY, tableColWidths[i], tableRowHeight);
                    ctx.fillStyle = i === 0 ? accentColor : '#22223b';
                    ctx.textAlign = 'center';
                    ctx.fillText(cell, colX + tableColWidths[i] / 2, tableY + tableRowHeight / 2 + 2);
                    colX += tableColWidths[i];
                });
                tableY += tableRowHeight;
            });
        } else {
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'left';
            ctx.fillText('No components', padding, tableY + tableRowHeight / 2 + 2);
        }

        qrcodeContainer.appendChild(canvas);
        downloadQRImage(canvas, `${parsedData.id || parsedData.nume || 'material'}_${parsedData.tip || 'qr'}.png`);
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
            history.push('/'); // Navigate to main screen after saving
        } catch {
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
