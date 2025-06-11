import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonModal, IonPage, IonTitle, IonToolbar, useIonAlert, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol } from '@ionic/react';
import './Tab1.css';
import labels from '../labels';
import { add, qrCode } from 'ionicons/icons';
import { Barcode, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { useEffect, useRef, useState } from 'react';
import AddItemModal from '../components/AddItemModal';
import { getAll, resetStore, save } from '../api/materials';



const Tab1: React.FC = () => {
  const [newItemData, setNewItemData] = useState({});
  const [isSupported, setisSupported] = useState(false)
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [presentAlert] = useIonAlert();

  const [materials, setMaterials] = useState([])
  const modal = useRef<HTMLIonModalElement>(null);
  console.log(newItemData)
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
  }
  const [message, setMessage] = useState(
    'This modal example uses triggers to automatically open a modal when the button is clicked.'
  );
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

  function onModalClose(toSave: boolean) {
    if (toSave) {
      save(newItemData)
    }
    modal.current?.dismiss().finally(() => {
      setNewItemData({});
      loadData();
    })

  }
  const loadData = async () => {
    console.log("loades")
    getAll().then((res) => {
      console.log(res)
      return res
    }).then((data) => setMaterials(data)).catch((error) => console.log(error));
  }

  useEffect(() => {
    loadData()
  }, [])
  console.log(materials)
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{labels.tab1}</IonTitle>

          <IonButtons slot="end">
            <IonButton onClick={() => scan()}> scan
              <IonIcon ios={qrCode} md={qrCode}></IonIcon>
            </IonButton>
            <IonButton onClick={() => { resetStore().then(() => loadData()) }}> DEMO
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

        <IonList>
          {materials?.map((material: any) => <IonItem button detail={true} key={material.id}
            onClick={() => { setNewItemData(material); modal.current?.present() }}>
            <IonLabel>
              <h3>
                {material.nume}
              </h3>
              <p>{material.tip}</p>
            </IonLabel>
            <IonLabel>
              {material.misc}
            </IonLabel>
          </IonItem>)}
        </IonList>
        <AddItemModal modal={modal} newItemData={newItemData} setNewItemData={setNewItemData} onModalClose={onModalClose}></AddItemModal>
      </IonContent>
      <IonFab slot="fixed" vertical="bottom" horizontal="end" id="open-modal">
        <IonFabButton>
          <IonIcon icon={add}></IonIcon>
        </IonFabButton>
      </IonFab>
    </IonPage >
  );
};

export default Tab1;

