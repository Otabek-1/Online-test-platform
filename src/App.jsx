import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function App() {
  const nav = useNavigate()
  useEffect(()=>{
    nav("/auth")
  },[])
  return (
    <div>App</div>
  )
}