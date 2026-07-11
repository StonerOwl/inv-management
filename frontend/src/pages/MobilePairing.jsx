import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Camera, CheckCircle, Smartphone, Wifi, ShieldCheck, ArrowRight } from 'lucide-react'
import { createDevice } from '../api/client'

export default function MobilePairing() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const [status, setStatus] = useState('idle') // idle, streaming, connected, error
  const [errorMsg, setErrorMsg] = useState('')
  const videoRef = useRef(null)

  useEffect(() => {
    if (!sessionId) {
      setStatus('error')
      setErrorMsg('No pairing session ID provided. Please scan the QR code from the dashboard again.')
    }
  }, [sessionId])

  const startPairing = async () => {
    try {
      setStatus('streaming')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error(err)
      setStatus('error')
      setErrorMsg('Failed to access camera. Please check your browser permissions.')
    }
  }

  const confirmPairing = async () => {
    try {
      // Register device on the backend
      const shortId = sessionId.substring(0, 6).toUpperCase()
      await createDevice({
        name: `Mobile Cam ${shortId}`,
        category: 'Cameras / Camera Arrays',
        subtype: 'Visual',
        interface: 'Wi-Fi',
        status: 'Online',
        linked_process: 'Visual Inspection'
      })
      
      setStatus('connected')
      
      // Stop the camera stream
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop())
      }
    } catch (err) {
      console.error(err)
      setStatus('error')
      setErrorMsg('Failed to connect to the backend server.')
    }
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <Camera size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Connection Failed</h1>
        <p className="text-slate-600 mb-8">{errorMsg}</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg">Try Again</button>
      </div>
    )
  }

  if (status === 'connected') {
    return (
      <div className="min-h-screen bg-green-500 flex flex-col items-center justify-center p-6 text-center text-white">
        <CheckCircle size={80} className="mb-6 opacity-90" />
        <h1 className="text-3xl font-extrabold mb-2">Device Paired!</h1>
        <p className="text-green-100 text-lg mb-8">This phone is now streaming data to the central dashboard.</p>
        <div className="bg-white/20 px-6 py-3 rounded-lg backdrop-blur-sm border border-white/30 font-mono">
          Session ID: {sessionId.substring(0, 8)}...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-center gap-2">
        <ShieldCheck className="text-green-400" size={20} />
        <h1 className="font-bold tracking-wider uppercase text-sm">Secure Edge Pairing</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {status === 'streaming' ? (
          <div className="w-full h-full absolute inset-0 bg-black flex flex-col">
            <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-12 flex justify-center">
              <button onClick={confirmPairing} className="bg-green-500 hover:bg-green-400 text-white font-bold py-4 px-10 rounded-full shadow-xl text-lg flex items-center gap-2 z-20">
                Connect to Dashboard <ArrowRight size={20}/>
              </button>
            </div>
            
            {/* Camera Overlay Elements */}
            <div className="absolute top-8 left-8 right-8 flex justify-between items-start pointer-events-none">
              <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded text-xs font-mono border border-white/20">LIVE</div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/30 rounded-lg pointer-events-none flex items-center justify-center">
              <div className="w-1 h-1 bg-white/50 rounded-full"></div>
            </div>
          </div>
        ) : (
          <div className="max-w-sm w-full bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700 text-center relative z-10 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            
            <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <Smartphone size={36} className="text-blue-400" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full border-4 border-slate-800 flex items-center justify-center">
                <Wifi size={14} className="text-white" />
              </div>
            </div>
            
            <h2 className="text-xl font-bold mb-2">Register this Device</h2>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              You are about to register this phone as a visual inspection camera on your industrial network.
            </p>
            
            <div className="bg-slate-900 rounded-lg p-3 text-left mb-8 border border-slate-700">
              <div className="flex justify-between items-center mb-1 text-xs text-slate-500 font-mono">
                <span>Session ID</span>
                <span className="text-blue-400">{sessionId ? sessionId.substring(0, 8) : '---'}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                <span>Target Node</span>
                <span className="text-slate-300">Central Hub</span>
              </div>
            </div>
            
            <button 
              onClick={startPairing}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              <Camera size={20} /> Open Camera
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
