'use client';
import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. PDF Upload Handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Bhai, pehle file toh select karo!");

    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const res = await fetch('http://localhost:8000/upload/pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setUploadStatus(data.message || 'File Uploaded Successfully!');
    } catch (error) {
      setUploadStatus('Upload fail ho gaya bhai.');
    }
  };

  // 2. Chat/Question Handler
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    const currentQuestion = question;
    setQuestion('');

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuestion }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setChatHistory((prev) => [...prev, { q: currentQuestion, a: data.answer }]);
      } else {
        alert(data.error || "Jawab nahi mil paya.");
      }
    } catch (error) {
      alert("Server se connect karne mein dikat hui.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      
      {/* Left Box: File Upload Area */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg h-fit">
        <h2 className="text-lg font-semibold mb-4 text-blue-400 border-b border-slate-800 pb-2">1. Upload Document</h2>
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-lg p-4 transition text-center cursor-pointer bg-slate-950">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            />
            {file && <p className="mt-2 text-xs text-green-400 font-medium">Selected: {file.name}</p>}
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg font-medium transition shadow-md">
            Upload PDF
          </button>
        </form>
        {uploadStatus && <p className="mt-3 text-sm text-yellow-400 text-center font-medium animate-pulse">{uploadStatus}</p>}
      </div>

      {/* Right Box: Chat Workspace */}
      <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg flex flex-col h-[520px]">
        <h2 className="text-lg font-semibold mb-4 text-purple-400 border-b border-slate-800 pb-2">2. Chat with your PDF (Local AI)</h2>
        
        {/* Messages Screen */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-slate-950 rounded-lg border border-slate-850 custom-scrollbar">
          {chatHistory.length === 0 ? (
            <div className="text-center mt-24 space-y-2">
              <p className="text-slate-400 text-base font-medium">Ask me anything!</p>
              <p className="text-slate-600 text-xs">PDF upload hone ke baad uske content se related kuch bhi type karein.</p>
            </div>
          ) : (
            chatHistory.map((chat, idx) => (
              <div key={idx} className="space-y-2 flex flex-col">
                {/* User Message */}
                <div className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-xl rounded-tr-none text-sm max-w-[85%] self-end text-right text-slate-200">
                  <span className="font-bold text-blue-400 block text-[10px] uppercase tracking-wider mb-1">You</span>
                  {chat.q}
                </div>
                {/* AI Message */}
                <div className="bg-slate-850 border border-slate-700/60 p-3 rounded-xl rounded-tl-none text-sm max-w-[85%] self-start text-left text-slate-200">
                  <span className="font-bold text-purple-400 block text-[10px] uppercase tracking-wider mb-1">Llama-3 (Local)</span>
                  {chat.a}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="bg-slate-850 border border-slate-700/60 p-3 rounded-xl text-sm max-w-[50%] self-start text-left text-slate-400 animate-pulse">
              <span className="font-bold text-purple-400 block text-[10px] uppercase tracking-wider mb-1">Llama-3</span>
              Thinking... 🤔
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleAskQuestion} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about the PDF..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white transition placeholder-slate-600"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 px-6 py-3 rounded-lg text-sm font-semibold transition text-white shadow-md"
          >
            Ask
          </button>
        </form>
      </div>

    </div>
  );
}