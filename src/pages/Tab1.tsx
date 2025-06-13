import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar, useIonAlert, IonSelect, IonSelectOption, IonAccordion, IonAccordionGroup } from '@ionic/react';
import './Tab1.css';
import labels from '../labels';
import { add, qrCode } from 'ionicons/icons';
import { Barcode, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { useEffect, useState } from 'react';
import { getAll, resetStore } from '../api/materials';
import { useIonRouter, useIonViewWillEnter } from '@ionic/react';
import { Material } from '../types';



const Tab1: React.FC = () => {
  const [, setisSupported] = useState(false)
  const [, setBarcodes] = useState<Barcode[]>([]);
  const [presentAlert] = useIonAlert();
  const router = useIonRouter();

  const [materials, setMaterials] = useState([])
  const [selectedState, setSelectedState] = useState('');
  const today = new Date();
  const lastWeeks = new Date();
  lastWeeks.setDate(today.getDate() - 14);
  const [dateFrom, setDateFrom] = useState<string | null>(lastWeeks.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string | null>(today.toISOString().split('T')[0]);
  useEffect(() => {
    BarcodeScanner.isSupported().then((result) => {
      setisSupported(result.supported);
    });
  }, []);

  const scan = async () => {
    const granted = await requestPermissions();
    if (!granted) {
      presentDenyAlert();
      return;
    }
    const { barcodes } = await BarcodeScanner.scan();
    setBarcodes(barcodes.concat(...barcodes));

    // Try to extract material id from QR code data and validate existence
    if (barcodes && barcodes.length > 0) {
      let id: string | null = null;
      let rawValue = barcodes[0].rawValue;
      if (typeof rawValue === 'string') {
        rawValue = rawValue.trim();
        try {
          // Try to parse as JSON
          const data = JSON.parse(rawValue);
          if (data && data.id) {
            id = data.id;
          }
        } catch {

          // Not JSON, treat as plain id string
          if (rawValue) {
            id = rawValue;
          }
        }
      }
      if (id) {
        // Validate if material exists
        const materials = await getAll();
        const found = materials && materials.find((m: Material) => m.id === id);
        if (found) {
          router.push(`/material/${id}`, 'forward', 'push');
          return;
        } else {
          await presentAlert({
            header: 'Material inexistent',
            message: 'Materialul scanat nu exista In aplicatie.' + id,
            buttons: ['OK'],
          });
          return;
        }
      }
    }
    // Optionally show an alert if no valid material id found
    await presentAlert({
      header: 'QR invalid',
      message: 'Codul QR scanat nu contine date valide de material.',
      buttons: ['OK'],
    });
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


  const loadData = async () => {
    getAll().then((res) => {
      return res
    }).then((data) => setMaterials(data)).catch((error) => console.log(error));
  }

  useIonViewWillEnter(() => {
    loadData();
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{labels.tab1}</IonTitle>

          <IonButtons slot="end">
            <IonButton onClick={() => { router.push('/material/', 'forward', 'push'); }}>
              {labels.add}
              <IonIcon icon={add}></IonIcon>
            </IonButton>

            <IonButton onClick={() => { resetStore().then(() => loadData()) }}>{labels.demo}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{labels.tab1}</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonAccordionGroup>
          <IonAccordion value="filters">
            <IonItem slot="header">
              <IonLabel>Filtre</IonLabel>
            </IonItem>
            <div className="ion-padding" slot="content">
              <IonItem>
                <IonLabel>{labels.filtruStare}</IonLabel>
                <IonSelect value={selectedState} placeholder="Alege starea" onIonChange={e => setSelectedState(e.detail.value)}>
                  <IonSelectOption value="">Toate</IonSelectOption>
                  <IonSelectOption value="Receptionat">Receptionat</IonSelectOption>
                  <IonSelectOption value="In lucru">In lucru</IonSelectOption>
                  <IonSelectOption value="Livrat">Livrat</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Data de la</IonLabel>
                <IonInput type="date" value={dateFrom ?? ''} onIonChange={e => setDateFrom(e.detail.value ?? null)} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Data până la</IonLabel>
                <IonInput type="date" value={dateTo ?? ''} onIonChange={e => setDateTo(e.detail.value ?? null)} />
              </IonItem>
            </div>
          </IonAccordion>
        </IonAccordionGroup>
        <IonList>
          {materials?.filter((material: Material) =>
            (!selectedState || material.stare === selectedState) &&
            (!dateFrom || new Date(material.createdAt) >= new Date(dateFrom)) &&
            (!dateTo || new Date(material.createdAt) <= new Date(dateTo))
          ).map((material: Material) => (
            <IonItem button detail={true} key={material.id}
              onClick={() => { router.push(`/material/${material.id}`, 'forward', 'push'); }}>
              <IonLabel>
                <h3>{material.nume}</h3>
                <p>{labels.tip}: {material.tip}</p>
                <p>{labels.stare}: {material.stare}</p>
                <p>{labels.descriere}: {material.descriere}</p>
                <p>{labels.createdAt}: {material.createdAt ? new Date(material.createdAt).toLocaleString('ro-RO') : ''}</p>
                <p>{labels.updatedAt}: {material.updatedAt ? new Date(material.updatedAt).toLocaleString('ro-RO') : ''}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
      <IonFab slot="fixed" vertical="bottom" horizontal="end" id="open-modal">
        <IonFabButton onClick={() => { scan() }}>
          <IonIcon ios={qrCode} md={qrCode}></IonIcon>
        </IonFabButton>
      </IonFab>
    </IonPage >
  );
};

export default Tab1;

