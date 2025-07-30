from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import torch
import torch.nn as nn
import timm
import numpy as np
from PIL import Image
import io
import base64
import albumentations as A
from albumentations.pytorch import ToTensorV2

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

class EfficientNetEncoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = timm.create_model('efficientnet_b0', pretrained=True, num_classes=0)
        self.mlp = nn.Sequential(
            nn.Linear(1280, 512),
            nn.ReLU(),
            nn.Linear(512, 256)
        )

    def forward(self, x):
        x = self.encoder(x)
        return self.mlp(x)

model = EfficientNetEncoder().to(DEVICE)
model.load_state_dict(torch.load('classification_skin_cancer.pth', map_location=DEVICE))
model.eval()

transform = A.Compose([
    A.Resize(224, 224),
    A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
    ToTensorV2()
])

def preprocess_image(image_data):
    if not image_data or ',' not in image_data:
        raise ValueError("Data gambar kosong atau tidak memiliki format base64 yang valid.")
    
    try:
        image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    except Exception as e:
        raise ValueError("Gagal membuka gambar. Pastikan file adalah gambar yang valid.") from e

    image_np = np.array(image)
    augmented = transform(image=image_np)
    image_tensor = augmented['image'].unsqueeze(0).to(DEVICE)
    return image_tensor

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        image_data = data.get('image', '')
        if not image_data:
            return jsonify({'status': 'error', 'message': 'Data gambar tidak ditemukan.'}), 400

        input_tensor = preprocess_image(image_data)
        with torch.no_grad():
            output = model(input_tensor)

        prediction = torch.sigmoid(output.mean()).item()
        confidence = abs(prediction - 0.5) * 2 * 100
        initial_result = 0 if prediction < 0.5 else 1

        if confidence < 50:
            final_result = 1 - initial_result
            confidence = 100 - confidence 
        else:
            final_result = initial_result

        return jsonify({
            'status': 'success',
            'prediction': final_result,
            'confidence': round(confidence, 2)
        })

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)