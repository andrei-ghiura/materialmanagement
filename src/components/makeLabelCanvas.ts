import QRious from "qrious";
import { Material } from "../types";
import { getAll } from "../api/materials";

/**
 * Generates a label canvas with QR code and components table for a material.
 * @param materialId The ID of the material to generate the label for
 * @returns Promise<HTMLCanvasElement | null>
 */
export async function makeLabelCanvas(materialId: string): Promise<HTMLCanvasElement | null> {
    const allMaterials: Material[] = await getAll();
    const parsedData = allMaterials.find((m) => m.id === materialId);
    if (!parsedData) return null;
    const qrcodeContainer = document.getElementById("qrcode");
    if (!qrcodeContainer) return null;
    while (qrcodeContainer.firstChild) qrcodeContainer.removeChild(qrcodeContainer.firstChild);
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = '420px';
    wrapper.style.margin = '0 auto';
    wrapper.style.position = 'relative';
    qrcodeContainer.appendChild(wrapper);
    const labelWidth = 420, labelHeight = 540, borderRadius = 16, borderColor = '#22223b', borderWidth = 5, headerHeight = 56, padding = 28, qrSize = 250, accentColor = '#1e293b', headerBg = '#fbbf24', headerText = '#22223b', tableHeaderBg = '#e5e7eb', tableHeaderColor = '#1e293b', tableBorder = '#cbd5e1', tableFont = 'bold 15px Arial', tableHeaderFont = 'bold 15px Arial', highlightBg = '#fef9c3', sectionTitleFont = 'bold 16px Arial', tableColWidths = [70, 120, 90, 70], tableRowHeight = 36;
    const components = (parsedData.componente || []).map((compId: string) => {
        const comp = allMaterials.find((m) => m.id === compId);
        return comp ? [comp.id, comp.nume] : [compId, ''];
    });
    const canvas = document.createElement('canvas');
    canvas.width = labelWidth;
    canvas.height = labelHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
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
    ctx.fillStyle = headerBg;
    ctx.fillRect(0, 0, labelWidth, headerHeight);
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = headerText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${parsedData.nume || ''} (${parsedData.id || ''})`, labelWidth / 2, headerHeight / 2);
    const qrTempCanvas = document.createElement('canvas');
    new QRious({ element: qrTempCanvas, value: JSON.stringify({ id: parsedData.id }), size: qrSize, background: 'transparent', padding: 0 });
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
    let tableY = qrY + qrSize + 32;
    ctx.font = sectionTitleFont;
    ctx.fillStyle = accentColor;
    ctx.textAlign = 'left';
    ctx.fillText('Componente', padding, tableY);
    tableY += 10;
    ctx.font = tableHeaderFont;
    ctx.textAlign = 'center';
    let colX = padding;
    const tableTotalWidth = labelWidth - 2 * padding;
    const colWidths = [Math.floor(tableTotalWidth * 0.4), Math.ceil(tableTotalWidth * 0.6)];
    ['ID', 'Name'].forEach((header, i) => {
        ctx.fillStyle = tableHeaderBg;
        ctx.fillRect(colX, tableY, colWidths[i], tableRowHeight);
        ctx.strokeStyle = tableBorder;
        ctx.strokeRect(colX, tableY, colWidths[i], tableRowHeight);
        ctx.fillStyle = tableHeaderColor;
        ctx.fillText(header, colX + colWidths[i] / 2, tableY + tableRowHeight / 2 + 2);
        colX += colWidths[i];
    });
    tableY += tableRowHeight;
    ctx.font = tableFont;
    if (components.length > 0) {
        components.forEach((row, idx) => {
            colX = padding;
            if (idx % 2 === 0) {
                ctx.fillStyle = highlightBg;
                ctx.fillRect(colX, tableY, colWidths[0] + colWidths[1], tableRowHeight);
            }
            row.forEach((cell, i) => {
                ctx.strokeStyle = tableBorder;
                ctx.strokeRect(colX, tableY, colWidths[i], tableRowHeight);
                ctx.fillStyle = i === 0 ? accentColor : '#22223b';
                ctx.textAlign = 'center';
                ctx.fillText(cell, colX + colWidths[i] / 2, tableY + tableRowHeight / 2 + 2);
                colX += colWidths[i];
            });
            tableY += tableRowHeight;
        });
    } else {
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'left';
        ctx.fillText('No components', padding, tableY + tableRowHeight / 2 + 2);
    }
    wrapper.appendChild(canvas);
    return canvas;
}
