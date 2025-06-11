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
import { Material } from '../types';

const store = new Storage();
store.create();


const resetStore = async () => {
    store.set('materials', mockMaterials);
};
function generateAlphanumericId() {
    // Generates a unique alphanumeric ID like MAT-XXXX
    return (
        'MAT-' + Math.random().toString(36).substr(2, 4).toUpperCase() + Date.now().toString(36).substr(-2).toUpperCase()
    );
}
const save = async (materialData: Material) => {
    const materials = await store.get('materials') || [];
    const now = new Date().toISOString();
    if (materialData.id) {
        const index = materials.findIndex((material: Material) => material.id === materialData.id);
        if (index !== -1) {
            materials[index] = {
                ...materials[index],
                ...materialData,
                updatedAt: now,
            };
        } else {
            materials.push({
                ...materialData,
                updatedAt: now,
                createdAt: now,
            });
        }
    } else {
        materials.push({
            id: generateAlphanumericId(),
            nume: materialData.nume || '',
            descriere: materialData.descriere || '',
            tip: materialData.tip || 'Materie prima',
            stare: materialData.stare || 'Receptionat',
            componente: materialData.componente || [],
            createdAt: now,
            updatedAt: now,
        });
    }
    return await store.set('materials', materials);
}
const getAll = async () => {
    return await store.get('materials');
}
const deleteMaterial = async (materialData: Material) => {
    const materials = await store.get('materials') || [];
    const index = materials.findIndex((material: Material) => material.id === materialData.id);
    if (index !== -1) {
        materials.splice(index, 1);
    }
    return await store.set('materials', materials);
}


export { save, getAll, deleteMaterial, resetStore }