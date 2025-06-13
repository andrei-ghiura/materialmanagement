import { IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonItem, IonLabel, IonPage, IonList, useIonViewWillEnter } from "@ionic/react";
import { useParams, useHistory } from "react-router-dom";
import { useState } from "react";
import { getAll } from "../api/materials";
import labels from "../labels";
import { Material } from "../types";
import jsPDF from "jspdf";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const MaterialComponents = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const [material, setMaterial] = useState<Material | null>(null);
    const [primeComponents, setPrimeComponents] = useState<Material[]>([]);
    const [processedComponents, setProcessedComponents] = useState<Material[]>([]);

    useIonViewWillEnter(() => {
        getAll().then((materials: Material[]) => {
            const found = materials.find((m) => m.id === id) || null;
            setMaterial(found);
            if (found) {
                const allComps = getAllComponentsRecursive(found, materials);
                setPrimeComponents(allComps.filter((c) => c.tip === 'Materie prima'));
                setProcessedComponents(allComps.filter((c) => c.tip !== 'Materie prima'));
            }
        });
    });

    // Recursively get all components for a material
    function getAllComponentsRecursive(mat: Material, materials: Material[], visited: Set<string> = new Set()): Material[] {
        if (!mat.componente || mat.componente.length === 0) return [];
        let result: Material[] = [];
        for (const compId of mat.componente) {
            if (visited.has(compId)) continue; // Prevent cycles
            visited.add(compId);
            const comp = materials.find((m) => m.id === compId);
            if (comp) {
                result.push(comp);
                result = result.concat(getAllComponentsRecursive(comp, materials, visited));
            }
        }
        return result;
    }

    const exportPDF = async () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });
        let y = 40;
        // Industrial header
        doc.setFillColor(251, 191, 36); // industrial yellow
        doc.rect(0, 0, 842, 60, 'F'); // A4 landscape width = 842pt
        doc.setFontSize(22);
        doc.setTextColor(34, 34, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(`Bill of Materials: ${material?.nume || ''} (${material?.id || ''})`, 40, 38);
        y = 80;
        // Table columns (wider for landscape)
        const columns = [
            { header: 'ID', dataKey: 'id', width: 90 },
            { header: 'Name', dataKey: 'nume', width: 170 },
            { header: 'Type', dataKey: 'tip', width: 90 },
            { header: 'Status', dataKey: 'stare', width: 90 },
            { header: 'Description', dataKey: 'descriere', width: 270 },
            { header: 'Prime/Processed', dataKey: 'prime', width: 90 },
        ];
        // Gather all components (prime and processed)
        const allRows: any[] = [];
        processedComponents.forEach((comp) => {
            allRows.push({ ...comp, prime: 'Processed' });
        });
        primeComponents.forEach((comp) => {
            allRows.push({ ...comp, prime: 'Prime' });
        });
        // Table header styling
        const tableX = 40;
        let tableY = y;
        doc.setFontSize(13);
        doc.setDrawColor(34, 34, 59);
        doc.setLineWidth(1.2);
        // Draw header row
        let colX = tableX;
        doc.setFillColor(229, 231, 235); // light gray
        columns.forEach(col => {
            doc.rect(colX, tableY, col.width, 32, 'F');
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.text(col.header, colX + 10, tableY + 21); // 10pt left padding, vertically centered
            colX += col.width;
        });
        tableY += 32;
        // Draw rows
        doc.setFont('helvetica', 'normal');
        allRows.forEach((row, idx) => {
            colX = tableX;
            if (idx % 2 === 0) {
                doc.setFillColor(254, 249, 195); // highlight yellow
                doc.rect(colX, tableY, columns.reduce((a, b) => a + b.width, 0), 28, 'F');
            }
            columns.forEach(col => {
                doc.setTextColor(34, 34, 59);
                doc.setFont('helvetica', col.dataKey === 'id' ? 'bold' : 'normal');
                let text = String(row[col.dataKey] || '');
                if (col.dataKey === 'descriere') {
                    text = text.length > 90 ? text.slice(0, 87) + '...' : text;
                }
                // Add left and right padding, and vertical centering
                doc.text(text, colX + 10, tableY + 19, { maxWidth: col.width - 20 });
                doc.rect(colX, tableY, col.width, 28);
                colX += col.width;
            });
            tableY += 28;
            if (tableY > 570) { // landscape A4 height
                doc.addPage();
                tableY = 40;
            }
        });
        // Save or export
        const fileName = `bill_of_materials_${material?.nume || material?.id || 'export'}.pdf`;
        if (Capacitor.getPlatform() === 'android') {
            const pdfOutput = doc.output('datauristring');
            const base64 = pdfOutput.split(',')[1];
            try {
                await Filesystem.writeFile({
                    path: fileName,
                    data: base64,
                    directory: Directory.Documents,
                    recursive: true
                });
                alert('PDF salvat in Documents!');
            } catch {
                alert('Eroare la salvarea PDF-ului.');
            }
        } else {
            doc.save(fileName);
        }
    };

    if (!material) return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton fill="clear" onClick={() => history.goBack()}>
                            <span style={{ fontSize: 20 }}>←</span>
                        </IonButton>
                    </IonButtons>
                    <IonTitle>{labels.componente}</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonLabel color="medium">Materialul nu a fost gasit.</IonLabel>
            </IonContent>
        </IonPage>
    );

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton fill="clear" onClick={() => history.goBack()}>
                            <span style={{ fontSize: 20 }}>←</span>
                        </IonButton>
                    </IonButtons>
                    <IonTitle>{labels.componente} pentru {material.nume}</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonButton expand="block" color="tertiary" onClick={exportPDF} className="mb-4"> {/* MODIFIED: Added Tailwind class for margin */}
                    Exporta lista ca PDF
                </IonButton>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"> {/* MODIFIED: Added grid layout */}
                    {/* Materiale prime */}
                    <div className="bg-white rounded-lg shadow p-4"> {/* MODIFIED: Replaced IonCard with styled div */}
                        <h3 className="text-lg font-semibold mb-2">Materiale prime</h3> {/* MODIFIED: Adjusted font size and margin */}
                        {primeComponents.length === 0 ? (
                            <IonLabel color="medium">Nicio materie prima gasita.</IonLabel>
                        ) : (
                            <IonList>
                                {primeComponents.map((comp) => (
                                    <IonItem button detail={true} key={comp.id} onClick={() => history.push(`/material/${comp.id}`)} className="py-2"> {/* MODIFIED: Adjusted padding */}
                                        <IonLabel>
                                            <h3 className="text-sm font-medium m-0">{comp.nume}</h3> {/* MODIFIED: Adjusted font size */}
                                            <p className="text-xs text-gray-500 m-0">{comp.tip}</p> {/* MODIFIED: Adjusted font size and color */}
                                            <span className="text-xs text-gray-400">{comp.descriere}</span> {/* MODIFIED: Adjusted font size and color */}
                                        </IonLabel>
                                    </IonItem>
                                ))}
                            </IonList>
                        )}
                    </div>


                </div>
            </IonContent>
        </IonPage>
    );
}

export default MaterialComponents;
