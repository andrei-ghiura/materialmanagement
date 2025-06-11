import { IonModal, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonItem, IonInput, IonTextarea, IonSelect, IonFooter, useIonAlert, IonCard, IonCardHeader, IonCardContent, IonSelectOption, IonLabel } from "@ionic/react";
import QRious from "qrious";
import { Barcode, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { useEffect, useState } from "react";
import { deleteMaterial, save } from "../api/materials";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Capacitor } from '@capacitor/core';
import { useHistory } from 'react-router-dom';


const AddItemModal = (props: any) => {
    const history = useHistory();
    const [, setisSupported] = useState(false)
    const [barcodes, setBarcodes] = useState<Barcode[]>([]);
    const [presentAlert] = useIonAlert();

    useEffect(() => {
        BarcodeScanner.isSupported().then((result) => {
            setisSupported(result.supported);
        });
    }, []);

    useEffect(() => {
        // Reset barcodes when the modal is opened for a new material
        setBarcodes([]);
    }, [props.newItemData]);

    // Modify the scan function to associate scanned components with the selected material
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
                    // Sanitize and parse the scanned data
                    const sanitizedData = rawData.replace(/[^\x20-\x7E]/g, ''); // Remove control characters
                    const scannedData = JSON.parse(sanitizedData);

                    // Add the scanned material to the list of components
                    setBarcodes((prevBarcodes) => [...prevBarcodes, scannedData]);

                    // Associate the scanned component with the selected material
                    const materialWithComponents = {
                        ...props.newItemData,
                        components: [...(props.newItemData.components || []), scannedData],
                    };

                    // Save the updated material with its components to the store
                    await save(materialWithComponents);

                    alert('Component added to the material successfully!');
                } catch (parseError) {
                    console.error('Error parsing scanned QR code data:', parseError);
                    alert('Invalid QR code data. Please scan a valid QR code.');
                }
            } else {
                alert('No QR code detected. Please try again.');
            }
        } catch (error) {
            console.error('Error scanning QR code:', error);
            alert('Failed to scan QR code. Please try again.');
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
        const base64Data = dataUrl.split(',')[1]; // Extract base64 data

        await requestStoragePermissions();
        try {
            const validFileName = fileName || `QR_Code_${Date.now()}.png`;
            const directory = Directory.Documents; // Use Documents directory for better compatibility

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
        console.log(your_data);
        const qrcodeContainer = document.getElementById("qrcode");
        if (!qrcodeContainer) return;
        qrcodeContainer.innerHTML = "";

        const qrCanvas = document.createElement('canvas');
        const context = qrCanvas.getContext('2d');
        if (!context) return;

        const parsedData = JSON.parse(your_data);
        const tableData = Object.entries(parsedData);

        // Set canvas size
        qrCanvas.width = 800;
        qrCanvas.height = 800;

        // Draw table on canvas
        context.fillStyle = "white";
        context.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
        context.fillStyle = "black";
        context.font = "20px Arial";

        let yPosition = 50;
        tableData.forEach(([key, value]) => {
            context.fillText(`${key}: ${value}`, 50, yPosition);
            yPosition += 30;
        });

        // Generate QR code in the same canvas
        new QRious({
            element: qrCanvas,
            value: your_data,
            size: 200,
            padding: 10,
        });

        qrcodeContainer.appendChild(qrCanvas);
        console.log(qrcodeContainer);
        downloadQRImage(qrCanvas, `${parsedData.id}_${parsedData.type}.png`);
    }

    const handleConfirm = async () => {
        try {
            // Save the barcodes to the store
            const updatedMaterial = {
                ...props.newItemData,
                components: barcodes,
            };
            await save(updatedMaterial);
            alert('Material and its components saved successfully!');
            props.onModalClose(true);
        } catch (error) {
            console.error('Error saving material:', error);
            alert('Failed to save material. Please try again.');
        }
    };

    return (<IonModal ref={props.modal} trigger="open-modal">
        <IonHeader>
            <IonToolbar>
                <IonButtons slot="start">
                    <IonButton onClick={() => props.onModalClose(false)}>Cancel</IonButton>
                </IonButtons>
                <IonButtons slot="end">
                    <IonButton strong={true} onClick={handleConfirm}>
                        Confirm
                    </IonButton>
                </IonButtons>
            </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
            <IonItem>
                <IonInput
                    label="Nume"
                    value={props.newItemData.nume}
                    onIonInput={(ev) => props.setNewItemData({ ...props.newItemData, nume: ev.target.value })}
                    labelPlacement="stacked"
                    type="text"
                />
            </IonItem>
            <IonItem>
                <IonSelect value={props.newItemData.tip} label="Tip" onIonChange={(ev) => props.setNewItemData({ ...props.newItemData, tip: ev.detail.value })}>
                    <IonSelectOption>Panou PAL</IonSelectOption>
                    <IonSelectOption>Panou MDF</IonSelectOption>
                    <IonSelectOption>Panou OSB</IonSelectOption>
                    <IonSelectOption>Panou HDF</IonSelectOption>
                    <IonSelectOption>Panou HPL</IonSelectOption>
                    <IonSelectOption>Panou CPL</IonSelectOption>
                    <IonSelectOption>Scândură</IonSelectOption>
                    <IonSelectOption>Placă de gips-carton</IonSelectOption>
                    <IonSelectOption>Placă de fibră de lemn</IonSelectOption>
                    <IonSelectOption>Placă de fibră de sticlă</IonSelectOption>
                </IonSelect>
            </IonItem>
            <IonItem>
                <IonTextarea
                    label="Alte Informații"
                    value={props.newItemData.misc}
                    onIonInput={(ev) => props.setNewItemData({ ...props.newItemData, misc: ev.target.value })}
                    labelPlacement="stacked"
                    placeholder="Alte informații despre material
                    Dimensiuni, greutate, etc."
                    rows={5}
                />
            </IonItem>
        </IonContent>

        <IonButton color={"danger"} onClick={() => {
            deleteMaterial(props.newItemData).then(() => {
                props.onModalClose(false);
            })
        }}>Șterge Materialul</IonButton>

        <IonCard>
            <IonCardHeader>Componente</IonCardHeader>
            {barcodes?.map((material: any, index: number) => (
                <IonItem button detail={true} key={index}>
                    <IonLabel>
                        <h3>{material.nume || 'Unnamed Component'}</h3>
                        <p>{material.tip || 'No Type Provided'}</p>
                    </IonLabel>
                    <IonLabel>
                        {material.misc || 'No Additional Information'}
                    </IonLabel>
                </IonItem>
            ))}
            <IonCardContent>
                <IonButton onClick={() => {
                    scan()
                }}>Scaneaza componentă</IonButton>
            </IonCardContent>
        </IonCard>

        <canvas hidden id="qrcode"></canvas>
        <IonFooter>
            <IonToolbar>
                <IonButtons slot="start">
                    <IonButton onClick={() => {
                        makeQR(JSON.stringify(props.newItemData))
                    }}>Generează QR</IonButton>
                </IonButtons>
                <IonButtons slot="end">
                    <IonButton onClick={() => {
                        history.push('/components-list');
                    }}>View All Components</IonButton>
                </IonButtons>
            </IonToolbar>
        </IonFooter>
    </IonModal>);
}
export default AddItemModal;