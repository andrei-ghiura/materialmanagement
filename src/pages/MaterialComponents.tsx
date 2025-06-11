import { IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonItem, IonLabel, IonPage, IonList, IonCard, IonCardHeader, IonCardContent, useIonViewWillEnter } from "@ionic/react";
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
        const doc = new jsPDF();
        let y = 10;
        doc.setFontSize(16);
        doc.text(`${labels.componente} pentru ${material?.nume}`, 10, y);
        y += 10;

        // Helper to draw a table
        function drawTable(header: string, rows: Material[], startY: number) {
            let tableY = startY;
            doc.setFontSize(14);
            doc.text(header, 10, tableY);
            tableY += 8;
            doc.setFontSize(11);
            // Table headers
            doc.setFillColor(230, 230, 230);
            doc.rect(10, tableY - 5, 190, 8, 'F');
            doc.text('Nume', 12, tableY);
            doc.text('Tip', 72, tableY);
            doc.text('Descriere', 112, tableY);
            tableY += 7;
            if (rows.length === 0) {
                doc.text('Nicio componenta gasita.', 12, tableY);
                tableY += 8;
            } else {
                rows.forEach((comp) => {
                    doc.text(comp.nume || '', 12, tableY);
                    doc.text(comp.tip || '', 72, tableY);
                    doc.text(comp.descriere || '', 112, tableY, { maxWidth: 85 });
                    tableY += 7;
                    if (tableY > 280) {
                        doc.addPage();
                        tableY = 10;
                    }
                });
            }
            return tableY + 4;
        }

        y = drawTable('Materiale prelucrate', processedComponents, y);
        y = drawTable('Materiale prime', primeComponents, y);

        if (Capacitor.getPlatform() === 'android') {
            // Save PDF using Capacitor Filesystem
            const pdfOutput = doc.output('datauristring');
            const base64 = pdfOutput.split(',')[1];
            const fileName = `componente_${material?.nume || material?.id || 'export'}.pdf`;
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
            doc.save(`componente_${material?.nume || material?.id || 'export'}.pdf`);
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
                <IonButton expand="block" color="tertiary" onClick={exportPDF} style={{ marginBottom: 16 }}>
                    Exporta lista ca PDF
                </IonButton>
                <IonCard>
                    <IonCardHeader>
                        {labels.componente} (Materiale prelucrate)
                    </IonCardHeader>
                    <IonCardContent>
                        {processedComponents.length === 0 && (
                            <IonLabel color="medium">Nicio componenta prelucrata gasita.</IonLabel>
                        )}
                        <IonList>
                            {processedComponents.map((comp) => (
                                <IonItem button detail={true} key={comp.id} onClick={() => history.push(`/material/${comp.id}`)}>
                                    <IonLabel>
                                        <h3 style={{ margin: 0 }}>{comp.nume}</h3>
                                        <p style={{ margin: 0 }}>{comp.tip}</p>
                                        <span style={{ fontSize: 13 }}>{comp.descriere}</span>
                                    </IonLabel>
                                </IonItem>
                            ))}
                        </IonList>
                    </IonCardContent>
                </IonCard>
                <IonCard>
                    <IonCardHeader>
                        Materiale prime
                    </IonCardHeader>
                    <IonCardContent>
                        {primeComponents.length === 0 && (
                            <IonLabel color="medium">Nicio materie prima gasita.</IonLabel>
                        )}
                        <IonList>
                            {primeComponents.map((comp) => (
                                <IonItem button detail={true} key={comp.id} onClick={() => history.push(`/material/${comp.id}`)}>
                                    <IonLabel>
                                        <h3 style={{ margin: 0 }}>{comp.nume}</h3>
                                        <p style={{ margin: 0 }}>{comp.tip}</p>
                                        <span style={{ fontSize: 13 }}>{comp.descriere}</span>
                                    </IonLabel>
                                </IonItem>
                            ))}
                        </IonList>
                    </IonCardContent>
                </IonCard>
            </IonContent>
        </IonPage>
    );
};

export default MaterialComponents;
