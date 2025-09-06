Due to its size, this Jupyter Notebook cannot be displayed on GitHub.  
Please download it locally or open it in Google Colab:  
[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/Matteo-Di-Iorio-s316606/Polito-Projects/blob/main/Emotion_Recognition_Using_Vision_Transformers/Project_Matteo_Di_Iorio_s316606.ipynb)

## **Abstract**

Emotion recognition from facial expressions is critical across domains ranging from human–computer interaction to mental health. However, conventional convolutional neural network (CNN)–based models, such as ResNet and VGG, struggle in complex scenarios characterized by ethnic variation, non-uniform lighting, and noisy data.
This project investigates Vision Transformers (ViT), an innovative architecture that partitions images into fixed-size patches and treats them as token sequences, leveraging self-attention to model global relationships within the image. This capability enables the capture of subtle details—such as micro-expressions—thereby improving emotion recognition over CNNs.
The model will be trained on the FER-2013 dataset following careful pre-processing; images are labeled with seven emotions. We apply data augmentation and regularization strategies for optimization. The ViT will be compared against standard CNN architectures (ResNet and VGG) to assess gains in accuracy and generalization.
Finally, model interpretability will be examined via attention maps to highlight facial regions most relevant to classification. Results will be evaluated using standard metrics—accuracy, F1-score, and confusion matrix—demonstrating the potential of ViTs for emotion recognition.
