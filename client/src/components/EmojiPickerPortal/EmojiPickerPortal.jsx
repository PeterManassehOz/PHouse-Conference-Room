import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import Picker from 'emoji-picker-react';

const EmojiPickerPortal = ({ onEmojiClick, onClose, position }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return createPortal(
    <div
    ref={containerRef}
    className="absolute z-50 max-w-[90vw] w-[320px] min-w-[260px]"
    style={{
        top: position.top,
        left: position.left
    }}
    >
      <Picker onEmojiClick={onEmojiClick} />
    </div>,
    document.body
  );
};

export default EmojiPickerPortal;
