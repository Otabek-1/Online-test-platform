import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { BiX } from "react-icons/bi"
import api from "../api"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    api.post("/auth/login", { username, password })
      .then(res => {
        console.log(res);
        
        setLoading(false)
        if (res.status === 200) {
          localStorage.setItem("access_token", res.data.data.access_token)
          localStorage.setItem("refresh_token", res.data.data.refresh_token)
          // Redirect or handle successful login
          window.location.href = "/dashboard"
        } else {
          setError(res.data?.message || "Login amalga oshmadi")
        }
      })
      .catch(err => {
        console.log(err);
        
        setLoading(false)
        const errorMsg = err.response?.data?.message || err.message || "Login/parol xato yoki server xatosi"
        setError(errorMsg)
        console.log(err);
        
      })
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-slate-100">
      <div className="w-[480px] max-w-full">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900 text-xl"
            >
              <BiX />
            </button>
          </div>
        )}

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl sm:text-3xl">Login</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Login kiriting"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-12 text-lg"
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 text-lg"
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full py-3 text-lg" disabled={loading}>
                {loading ? "Kirilmoqda..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
