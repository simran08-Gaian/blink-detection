import React, { useRef, useEffect, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

const MediapipeBlinkDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [blinks, setBlinks] = useState(0);

  // Eye Aspect Ratio (EAR) Threshold and Consecutive Frames
  const EAR_THRESHOLD = 0.25;
  const CONSEC_FRAMES = 2;

  // Variables to track blink detection
  let frameCount = 0;
  let blinkCount = 0;
  let blinkFlag = false;

  // Function to calculate Euclidean distance
  const distance = (pt1, pt2) => {
    return Math.hypot(pt2.x - pt1.x, pt2.y - pt1.y);
  };

  // Function to calculate Eye Aspect Ratio (EAR)
  const calculateEAR = (eye) => {
    const A = distance(eye[1], eye[5]);
    const B = distance(eye[2], eye[4]);
    const C = distance(eye[0], eye[3]);
    const ear = (A + B) / (2.0 * C);
    return ear;
  };

  useEffect(() => {
    // Initialize FaceMesh
    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);

    // Initialize Camera
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await faceMesh.send({ image: videoRef.current });
      },
      width: 720,
      height: 560,
    });

    camera.start();

    // Cleanup on component unmount
    return () => {
      faceMesh.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onResults = (results) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Draw the video frame
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      results.image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];

      // Define eye indices based on Mediapipe's landmarks
      const leftEyeIndices = [33, 160, 158, 133, 153, 144];
      const rightEyeIndices = [263, 387, 385, 362, 380, 373];

      // Extract eye landmarks
      const leftEye = leftEyeIndices.map((index) => landmarks[index]);
      const rightEye = rightEyeIndices.map((index) => landmarks[index]);

      // Calculate EAR for both eyes
      const leftEAR = calculateEAR(leftEye);
      const rightEAR = calculateEAR(rightEye);

      // Average EAR
      const avgEAR = (leftEAR + rightEAR) / 2.0;

      // Debugging logs (optional)
      console.log(`Left EAR: ${leftEAR.toFixed(3)}, Right EAR: ${rightEAR.toFixed(3)}, Avg EAR: ${avgEAR.toFixed(3)}`);

      // Blink Detection Logic
      if (avgEAR < EAR_THRESHOLD) {
        frameCount += 1;

        if (frameCount >= CONSEC_FRAMES && !blinkFlag) {
          blinkCount += 1;
          setBlinks(blinkCount);
          blinkFlag = true;
          console.log(`Blink Detected! Total Blinks: ${blinkCount}`);
        }
      } else {
        frameCount = 0;
        blinkFlag = false;
      }

      // (Optional) Draw Eye Landmarks
      // drawEyeLandmarks(ctx, leftEye, 'blue');
      // drawEyeLandmarks(ctx, rightEye, 'red');
    }

    ctx.restore();
  };

  // Function to draw eye landmarks (Optional)
  const drawEyeLandmarks = (ctx, eye, color) => {
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.moveTo(eye[0].x * canvasRef.current.width, eye[0].y * canvasRef.current.height);
    for (let i = 1; i < eye.length; i++) {
      ctx.lineTo(eye[i].x * canvasRef.current.width, eye[i].y * canvasRef.current.height);
    }
    ctx.closePath();
    ctx.stroke();
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <h2>Mediapipe Blink Detector</h2>
      <video
        ref={videoRef}
        style={{ display: 'none' }} // Hide the original video element
        autoPlay
        muted
      />
      <canvas
        ref={canvasRef}
        width={720}
        height={560}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <div style={{ marginTop: '580px' }}>
        <h3>Blinks Detected: {blinks}</h3>
      </div>
    </div>
  );
};

export default MediapipeBlinkDetector;
