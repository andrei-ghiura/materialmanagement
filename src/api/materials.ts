// import axios, { isCancel, AxiosError } from 'axios';
// const save = async (materialData: any) => {
//     axios.post(`${import.meta.env.VITE_WORKER_URL}/addMaterial`, materialData,
//         { headers: { "Content-Type": "application/json" } })
//         .then(function (response) {
//             console.log(response);
//         })
//         .catch(function (error) {
//             console.log(error);
//         });
// }


// const getAll = async () => axios.get(`${import.meta.env.VITE_WORKER_URL}/getAllMaterials`)
// const deleteMaterial = async (id) => axios.get(`${import.meta.env.VITE_WORKER_URL}/deleteMaterial/${id}`)


import { Storage } from '@ionic/storage';
import mockMaterials from './mockMaterials';

const store = new Storage();
store.create();


const resetStore = async () => {
    store.set('materials', mockMaterials);
};
const save = async (materialData: any) => {
    const materials = await store.get('materials') || [];
    if (materialData.id) {
        const index = materials.findIndex((material: any) => material.id === materialData.id);
        if (index !== -1) {
            materials[index] = materialData;
        } else {
            materials.push(materialData);
        }
    } else {
        materials.push({ ...materialData, id: Date.now() });
    }
    return await store.set('materials', materials);
}
const getAll = async () => {
    return await store.get('materials');
}
const deleteMaterial = async (materialData) => {
    const materials = await store.get('materials') || [];
    const index = materials.findIndex((material: any) => material.id === materialData.id);
    if (index !== -1) {
        materials.splice(index, 1);
    }
    return await store.set('materials', materials);
}


export { save, getAll, deleteMaterial, resetStore }