import React, { useRef, useEffect } from 'react';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  isEditable: boolean;
  className?: string;
  multiline?: boolean;
}

export default function EditableText({
  value,
  onSave,
  isEditable,
  className = '',
  multiline = false,
}: EditableTextProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  // Sync with value changes if external updates happen
  useEffect(() => {
    if (elementRef.current && elementRef.current.innerText !== value) {
      elementRef.current.innerText = value;
    }
  }, [value]);

  if (!isEditable) {
    return <span className={className}>{value}</span>;
  }

  const handleBlur = () => {
    if (elementRef.current) {
      const text = elementRef.current.innerText || '';
      if (text.trim() !== value.trim()) {
        onSave(text);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      elementRef.current?.blur();
    }
  };

  return (
    <div
      ref={elementRef}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`inline-block relative group outline-none transition-all duration-200 rounded px-1 -mx-1 cursor-text select-text
        border border-dashed border-transparent hover:border-[#2EC4B6]/50 hover:bg-[#2EC4B6]/5 
        focus:border-solid focus:border-[#2EC4B6] focus:bg-[#2EC4B6]/10 min-w-[20px] ${className}`}
      title="Click to edit text directly"
    >
      {value}
    </div>
  );
}
