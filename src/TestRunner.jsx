import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import api from "./api";

export default function TestRunner() {
  const { key } = useParams();

  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  console.log(sections);
  
  const [userData, setUserData] = useState({
    full_name: "",
    phone: "",
  });

  const [answers, setAnswers] = useState({});

  // ============================
  // 1) TESTNI YOZIB KELISH
  // ============================
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.post("/test/get", { key });
        const raw = res.data.data.test_json;

        const parsed = JSON.parse(raw); // STRING -> OBJECT

        // chiqaramiz: parsed.sections = [ {id, name, questions: [...] } ]
        setSections(parsed.sections || []);
      } catch (err) {
        console.error("Test fetch error:", err);
      }
      setLoading(false);
    };
    load();
  }, [key]);

  const userFormCompleted =
    userData.full_name

  // barcha savollar javob berilganmi?
  const allQuestions = sections.flatMap((s) => s.questions || []);
  const allAnswered =
    allQuestions.length > 0 &&
    allQuestions.every((q) => answers[q.id]);

// ============================
  // 2) TESTNI YUBORISH
  // ============================
  const handleSubmit = async () => {
    try {
      const [first, ...lastArr] = userData.full_name.trim().split(" ");
      const last = lastArr.join(" ") || "";

      // Backend kutayotgan format:
      const payload = {
        first_name: first,
        last_name: last,
        phone: userData.phone,
        key,
        sections: sections.map((sec) => ({
          section_id: sec.id,
          questions: (sec.questions || []).map((q) => ({
            question_id: q.id,
            option_ids: [answers[q.id]] || [], // Barcha savollar yuboriladi
          })),
        })),
      };

      console.log("📤 Yuborilayotgan payload:", JSON.stringify(payload, null, 2));

      const response = await api.post("/job/submit", payload);
      
      console.log("✅ Backend javobi:", response.data);

      setSubmitted(true);
    } catch (err) {
      console.error("❌ Submit error:", err);
      console.error("📋 Backend error response:", err.response?.data);
      console.error("📋 Backend status:", err.response?.status);
      
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Yuborishda xatolik: ${errorMsg}`);
    }
  };

  if (loading)
    return (
      <p className="text-center mt-10 text-lg">Yuklanmoqda...</p>
    );

  if (submitted)
    return (
      <div className="max-w-xl mx-auto mt-10 text-center">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">
            Natijangiz qabul qilindi!
          </h2>
          <p className="text-gray-600">Tez orada ko'rib chiqiladi.</p>

          <p className="text-gray-600">Murojaat uchun: <a href="tel:+998882669966">+998(88) 266-99-66</a></p>
        </Card>
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto mt-10 p-4 space-y-6">
      {/* ============ USER FORM ============= */}
      {!started && (
        <Card className="p-6 shadow-xl rounded-2xl">
          <h2 className="text-xl font-semibold mb-4">
            Ishtirokchi ma'lumotlari
          </h2>
          <div className="space-y-3">
            <Input
              placeholder="Full name"
              value={userData.full_name}
              onChange={(e) =>
                setUserData({ ...userData, full_name: e.target.value })
              }
            />
            <Input
              placeholder="Phone"
              value={userData.phone}
              onChange={(e) =>
                setUserData({ ...userData, phone: e.target.value })
              }
            />
            

            <Button
              className="w-full mt-3"
              disabled={!userFormCompleted}
              onClick={() => setStarted(true)}
            >
              Testni boshlash
            </Button>
          </div>
        </Card>
      )}

      {/* ============ TEST QISMI ============= */}
      {started && (
        <div className="space-y-6">
          {sections.map((sec) => (
            <div key={sec.id} className="space-y-4">
              <h2 className="text-xl font-bold">{sec.name}</h2>

              {(sec.questions || []).map((q) => (
                <Card
                  key={q.id}
                  className="p-6 shadow-xl rounded-2xl"
                >
                  <h3 className="text-lg font-semibold mb-4">
                    {q.text}
                  </h3>

                  <RadioGroup
                    value={answers[q.id] || ""}
                    onValueChange={(val) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: Number(val),
                      }))
                    }
                  >
                    {q.options.map((op, idx) => {
                      const variant = ["A", "B", "C", "D"][idx] || "";

                      return (
                        <div
                          key={op.id}
                          className="flex items-center space-x-2 mb-2"
                        >
                          <RadioGroupItem
                            value={op.id}
                            id={`q${q.id}-${op.id}`}
                          />
                          <Label htmlFor={`q${q.id}-${op.id}`}>
                            {variant}. {op.text}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </Card>
              ))}
            </div>
          ))}

          <Button
            className="w-full py-3 text-lg"
            disabled={!allAnswered}
            onClick={handleSubmit}
          >
            Yuborish
          </Button>
        </div>
      )}
    </div>
  );
}
