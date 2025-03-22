import React from 'react';
import './styles.css';

interface VideoDisplayProps {
  isJoined: boolean;
  avatarVideoUrl: string;
}

const VideoDisplay: React.FC<VideoDisplayProps> = ({ isJoined, avatarVideoUrl }) => {
  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  return (
    <div className="video-container">
      {isImageUrl(avatarVideoUrl) ? (
        <img
          id="placeholder-image"
          hidden={isJoined}
          src={avatarVideoUrl}
          alt="Avatar placeholder"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        <video id="placeholder-video" hidden={isJoined} src={avatarVideoUrl} loop muted playsInline autoPlay></video>
      )}
      <video id="remote-video"></video>
    </div>
  );
};

export default VideoDisplay;
