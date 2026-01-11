import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FiBook, FiBarChart2, FiLogOut } from "react-icons/fi";
import Exams from "./Exams";
import Results from "./Results";
import { useNavigate } from "react-router-dom";
import { CardSim, WalletCards } from "lucide-react";
import logo from "./assets/logo.png"

export default function Dashboard() {
    const [active, setActive] =useState(localStorage.getItem("active") || "exams");
    const nav = useNavigate();
    function logOut(){
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        nav("/auth");
    }
    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className="w-60 bg-gradient-to-t from-slate-900 via-slate-700 to-slate-600 text-white flex flex-col py-6 px-4 gap-4">
                <img src={logo} className="w-[60%]" alt="" style={{alignSelf:"center"}} />

                <Button
                    onClick={() => setActive("exams")}
                    variant="ghost"
                    className="justify-start text-white hover:bg-slate-700 text-lg cursor-pointer"
                >
                    <FiBook className="mr-2" /> IMTIHONLAR
                </Button>

                <Button
                    onClick={() => setActive("results")}
                    variant="ghost"
                    className="justify-start text-white hover:bg-slate-700 text-lg cursor-pointer"
                >
                    <FiBarChart2 className="mr-2" /> NATIJALAR
                </Button>

                <div className="mt-auto">
                    <Button
                        variant="destructive"
                        className="w-full justify-start text-white"
                        onClick={logOut}
                    >
                        <FiLogOut className="mr-2" /> Chiqish
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-slate-100 p-6">
                {active === "exams" && <Exams />}
                {active === "results" && <Results />}
                {active === "sections" && <SectionList />}
            </div>
        </div>
    );
}
