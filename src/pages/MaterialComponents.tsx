import React, { useEffect, useState } from 'react';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons } from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { getAll } from '../api/materials';
import labels from '../labels';
import jsPDF from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const MaterialComponents: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const [material, setMaterial] = useState<any>(null);
    const [allMaterials, setAllMaterials] = useState<any[]>([]);

    useEffect(() => {
        getAll().then((materials) => {
            setAllMaterials(materials);
            const found = materials.find((m: any) => m.id === id);
            setMaterial(found || null);
        });
    }, [id]);

    // Helper to recursively collect all prime materials from a list of component IDs
    function collectPrimeMaterials(componentIds: string[], allMaterials: any[], visited = new Set()): any[] {
        let result: any[] = [];
        for (const compId of componentIds) {
            if (visited.has(compId)) continue; // avoid cycles
            visited.add(compId);
            const comp = allMaterials.find((m) => m.id === compId);
            if (!comp) continue;
            if (comp.tip === 'Materie prima') {
                result.push(comp);
            } else if (Array.isArray(comp.componente) && comp.componente.length > 0) {
                result = result.concat(collectPrimeMaterials(comp.componente, allMaterials, visited));
            }
        }
        return result;
    }

    // PDF generation handler
    const handlePrintPDF = async () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Materii prime pentru ${material.nume}`, 10, 15);
        let y = 25;
        uniquePrimeMaterials.forEach((comp, idx) => {
            if (y > 270) { doc.addPage(); y = 20; }
            // Card border
            doc.setDrawColor(100);
            doc.setLineWidth(0.3);
            doc.roundedRect(8, y - 3, 190, 32, 3, 3);
            doc.setFontSize(13);
            doc.text(`${idx + 1}. ${comp.nume || comp.id}`, 12, y + 5);
            doc.setFontSize(11);
            doc.text(`Tip: ${comp.tip || ''}`, 12, y + 12);
            doc.text(`Stare: ${comp.stare || ''}`, 70, y + 12);
            doc.text(`Descriere: ${comp.descriere || ''}`, 12, y + 19, { maxWidth: 180 });
            doc.text(`Creat la: ${comp.createdAt ? new Date(comp.createdAt).toLocaleString('ro-RO') : ''}`, 12, y + 26);
            doc.text(`Modificat la: ${comp.updatedAt ? new Date(comp.updatedAt).toLocaleString('ro-RO') : ''}`, 90, y + 26);
            y += 36;
        });
        const fileName = `MateriiPrime_${material.nume || material.id}.pdf`;
        if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
            // Save PDF to device using Capacitor Filesystem
            const pdfOutput = doc.output('arraybuffer');
            const pdfBlob = new Blob([pdfOutput], { type: 'application/pdf' });
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result?.toString().split(',')[1];
                if (base64data) {
                    await Filesystem.writeFile({
                        path: fileName,
                        data: base64data,
                        directory: Directory.Documents,
                        recursive: true,
                    });
                    alert('PDF salvat in Documents!');
                } else {
                    alert('Eroare la generarea PDF-ului.');
                }
            };
            reader.readAsDataURL(pdfBlob);
        } else {
            // Web: trigger download
            doc.save(fileName);
        }
    };

    if (!material) return null;

    // Get all unique prime materials from the components tree
    const primeMaterials = material.componente ? collectPrimeMaterials(material.componente, allMaterials) : [];
    // Remove duplicates by id
    const uniquePrimeMaterials = Array.from(new Map(primeMaterials.map(m => [m.id, m])).values());

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar >
                    <IonButtons slot="start">
                        <IonButton fill="clear" onClick={() => history.goBack()}>
                            <span style={{ fontSize: 20 }}>←</span>
                        </IonButton>
                    </IonButtons>
                    <IonTitle>Materii prime pentru {material.nume}</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <IonButton color="primary" onClick={handlePrintPDF}>
                        Genereaza PDF pentru tiparire
                    </IonButton>
                </div>
                {uniquePrimeMaterials.length === 0 && (
                    <IonCard>
                        <IonCardContent>Nicio materie prima gasita.</IonCardContent>
                    </IonCard>
                )}
                {uniquePrimeMaterials.map((comp, idx) => (
                    <IonCard key={comp.id || idx} style={{ marginBottom: 16 }}>
                        <IonCardHeader>
                            <IonCardTitle>{comp.nume || comp.id}</IonCardTitle>
                        </IonCardHeader>
                        <IonCardContent>
                            <p><b>{labels.tip}:</b> {comp.tip}</p>
                            <p><b>{labels.stare}:</b> {comp.stare}</p>
                            <p><b>{labels.descriere}:</b> {comp.descriere}</p>
                            <p><b>{labels.createdAt}:</b> {comp.createdAt ? new Date(comp.createdAt).toLocaleString('ro-RO') : ''}</p>
                            <p><b>{labels.updatedAt}:</b> {comp.updatedAt ? new Date(comp.updatedAt).toLocaleString('ro-RO') : ''}</p>
                            <IonButton expand="block" onClick={() => history.push(`/material/${comp.id}`)}>{labels.detalii}</IonButton>
                        </IonCardContent>
                    </IonCard>
                ))}
            </IonContent>
        </IonPage>
    );
};

export default MaterialComponents;