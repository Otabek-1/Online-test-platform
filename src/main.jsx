import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Auth from './components/Auth.jsx'
import Dashboard from './Dashboard'
import Sections from './Sections'
import Tests from './Tests'
import TestRunner from './TestRunner'
// import SectionList from './SectionList'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}/>
      <Route path='/auth' element={<Auth />}/>
      <Route path='/dashboard' element={<Dashboard />}/>
      <Route path='/sections/:examId' element={<Sections />}/>
      <Route path='/tests/:sectionId' element={<Tests />}/>
      <Route path='/test/:key' element={<TestRunner />}/>
      {/* <Route path='/section/list' element={<SectionList />}/> */}
    </Routes>
  </BrowserRouter>
)
