import { assetPath } from './assetBase.js';

export const images = {
    get woodTexture() {
        return assetPath('src/assets/images/wood_texture.png');
    },
    get notebookPaper() {
        return assetPath('src/assets/images/notebook_texture.png');
    }
};

console.log('Texture paths ready');
