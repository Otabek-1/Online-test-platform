import React from "react";
import { Button } from "@/components/ui/button";
import { FiBook, FiBarChart2, FiLogOut } from "react-icons/fi";
import Exams from "./Exams";
import Results from "./Results";
import { useNavigate } from "react-router-dom";
import { CardSim, WalletCards } from "lucide-react";
import SectionList from "./SectionList";

export default function Dashboard() {
    const [active, setActive] = React.useState("exams");
    const nav = useNavigate();
    function logOut(){
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        nav("/auth");
    }
    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className="w-60 bg-slate-900 text-white flex flex-col py-6 px-4 gap-4">
                <h2 className="text-2xl font-bold mb-6 text-center">Menu</h2>

                <Button
                    onClick={() => setActive("exams")}
                    variant="ghost"
                    className="justify-start text-white hover:bg-slate-700"
                >
                    <FiBook className="mr-2" /> Imtihonlar
                </Button>

                <Button
                    onClick={() => setActive("sections")}
                    variant="ghost"
                    className="justify-start text-white hover:bg-slate-700"
                >
                    <WalletCards className="mr-2" /> Bo'limlar
                </Button>

                <Button
                    onClick={() => setActive("results")}
                    variant="ghost"
                    className="justify-start text-white hover:bg-slate-700"
                >
                    <FiBarChart2 className="mr-2" /> Natijalar
                </Button>

                <div className="mt-auto">
                    <Button
                        variant="destructive"
                        className="w-full justify-start text-white"
                        onClick={logOut}
                    >
                        <FiLogOut className="mr-2" /> Log out
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
