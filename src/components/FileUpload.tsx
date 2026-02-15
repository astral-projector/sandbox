import { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  onFileLoaded: (text: string) => void;
  hasFile: boolean;
}

export default function FileUpload({ onFileLoaded, hasFile }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".txt")) {
        alert("Please upload a .txt file exported from WhatsApp.");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onFileLoaded(text);
      };
      reader.readAsText(file);
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (hasFile && fileName) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{fileName}</p>
              <p className="text-xs text-gray-500">Chat loaded successfully</p>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Upload different file
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          onChange={handleChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
        isDragging
          ? "border-indigo-400 bg-indigo-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">
            Drop your WhatsApp chat export here, or{" "}
            <span className="text-indigo-600">browse</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            .txt file from WhatsApp's "Export chat" feature
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
