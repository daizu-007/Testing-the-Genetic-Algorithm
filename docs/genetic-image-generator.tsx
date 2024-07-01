import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const IMAGE_SIZE = 64;
const MUTATION_RATE = 0.05; // 5%のピクセルを変異させる

const ImageGenerator = () => {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [generation, setGeneration] = useState(0);
  const [referenceImage, setReferenceImage] = useState(null);
  const [autoMode, setAutoMode] = useState(false);

  useEffect(() => {
    generateInitialImages();
  }, []);

  useEffect(() => {
    let isRunning = false;

    const runAutoMode = async () => {
      if (isRunning || !autoMode || !referenceImage) return;

      isRunning = true;
      try {
        const bestMatchIndex = await findBestMatch();
        await handleImageSelect(bestMatchIndex);
        
        if (autoMode) {
          setTimeout(runAutoMode, 0);
        }
      } finally {
        isRunning = false;
      }
    };

    if (autoMode && referenceImage) {
      runAutoMode();
    }

    return () => {
      isRunning = false;
    };
  }, [autoMode, referenceImage, images]);

  const generateInitialImages = () => {
    const newImages = Array(2).fill().map(() => generateRandomImage());
    setImages(newImages);
    setGeneration(0);
  };

  const generateRandomImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_SIZE;
    canvas.height = IMAGE_SIZE;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(IMAGE_SIZE, IMAGE_SIZE);

    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = Math.floor(Math.random() * 256);
      imageData.data[i + 1] = Math.floor(Math.random() * 256);
      imageData.data[i + 2] = Math.floor(Math.random() * 256);
      imageData.data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  };

  const mutateImage = (baseImage) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = IMAGE_SIZE;
      canvas.height = IMAGE_SIZE;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.src = baseImage;
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);

        for (let i = 0; i < imageData.data.length; i += 4) {
          if (Math.random() < MUTATION_RATE) {
            imageData.data[i] = Math.floor(Math.random() * 256);
            imageData.data[i + 1] = Math.floor(Math.random() * 256);
            imageData.data[i + 2] = Math.floor(Math.random() * 256);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };
    });
  };

  const handleImageSelect = async (index) => {
    setSelectedImage(images[index]);
    const baseImage = images[index];
    const mutatedImage = await mutateImage(baseImage);
    setImages([baseImage, mutatedImage]);
    setGeneration(prev => prev + 1);
  };

  const handleReferenceImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = IMAGE_SIZE;
          canvas.height = IMAGE_SIZE;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
          setReferenceImage(canvas.toDataURL());
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateImageSimilarity = useCallback((img1, img2) => {
    const canvas1 = document.createElement('canvas');
    const canvas2 = document.createElement('canvas');
    canvas1.width = canvas2.width = IMAGE_SIZE;
    canvas1.height = canvas2.height = IMAGE_SIZE;
    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');

    return new Promise((resolve) => {
      const image1 = new Image();
      const image2 = new Image();
      image1.onload = () => {
        ctx1.drawImage(image1, 0, 0);
        image2.src = img2;
      };
      image2.onload = () => {
        ctx2.drawImage(image2, 0, 0);
        const imageData1 = ctx1.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
        const imageData2 = ctx2.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
        let diff = 0;
        for (let i = 0; i < imageData1.data.length; i += 4) {
          diff += Math.abs(imageData1.data[i] - imageData2.data[i]);
          diff += Math.abs(imageData1.data[i+1] - imageData2.data[i+1]);
          diff += Math.abs(imageData1.data[i+2] - imageData2.data[i+2]);
        }
        resolve(diff);
      };
      image1.src = img1;
    });
  }, []);

  const findBestMatch = useCallback(async () => {
    if (!referenceImage) return 0;
    const similarities = await Promise.all(
      images.map(img => calculateImageSimilarity(referenceImage, img))
    );
    return similarities.indexOf(Math.min(...similarities));
  }, [images, referenceImage, calculateImageSimilarity]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">遺伝的アルゴリズム画像生成器 (64x64)</h1>
      <p className="mb-4">世代: {generation}</p>
      <div className="flex justify-center space-x-4 mb-4">
        {images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Generated Image ${index + 1}`}
            className="w-32 h-32 cursor-pointer border-2 hover:border-blue-500"
            style={{imageRendering: 'pixelated'}}
            onClick={() => !autoMode && handleImageSelect(index)}
          />
        ))}
      </div>
      <div className="mb-4">
        <input type="file" accept="image/*" onChange={handleReferenceImageUpload} className="mb-2" />
        {referenceImage && (
          <img 
            src={referenceImage} 
            alt="Reference Image" 
            className="w-32 h-32 object-cover" 
            style={{imageRendering: 'pixelated'}}
          />
        )}
      </div>
      <div className="flex items-center space-x-2 mb-4">
        <Switch
          id="auto-mode"
          checked={autoMode}
          onCheckedChange={setAutoMode}
        />
        <Label htmlFor="auto-mode">自動モード</Label>
      </div>
      <Button onClick={generateInitialImages} disabled={autoMode}>新しい画像セットを生成</Button>
    </div>
  );
};

export default ImageGenerator;
