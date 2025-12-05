"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardHeader from '@/components/DashboardHeader';
import DashboardFooter from '@/components/DashboardFooter';

interface Consultation {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled";
}

interface AvailableDoctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  availableSlots: string[];
}

export default function DoctorConsultationPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([
    {
      id: "1",
      doctorName: "Dr. Rajesh Kumar",
      specialty: "Cardiologist",
      date: "2025-12-05",
      time: "10:00 AM",
      status: "scheduled"
    },
    {
      id: "2",
      doctorName: "Dr. Priya Sharma",
      specialty: "Nutritionist",
      date: "2025-11-30",
      time: "2:00 PM",
      status: "completed"
    }
  ]);

  const [availableDoctors] = useState<AvailableDoctor[]>([
    {
      id: "d1",
      name: "Dr. Rajesh Kumar",
      specialty: "Cardiologist",
      rating: 4.8,
      availableSlots: ["9:00 AM", "10:00 AM", "2:00 PM", "4:30 PM"]
    },
    {
      id: "d2",
      name: "Dr. Priya Sharma",
      specialty: "Nutritionist",
      rating: 4.9,
      availableSlots: ["11:00 AM", "3:00 PM", "5:00 PM"]
    },
    {
      id: "d3",
      name: "Dr. Amit Patel",
      specialty: "General Physician",
      rating: 4.7,
      availableSlots: ["10:30 AM", "1:00 PM", "6:00 PM"]
    },
    {
      id: "d4",
      name: "Dr. Neha Singh",
      specialty: "Dermatologist",
      rating: 4.6,
      availableSlots: ["9:30 AM", "2:30 PM", "4:00 PM"]
    }
  ]);

  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showBooking, setShowBooking] = useState(false);

  const bookConsultation = () => {
    if (!selectedDoctor || !selectedSlot || !selectedDate) {
      alert("Please select a doctor, date, and time");
      return;
    }

    const doctor = availableDoctors.find(d => d.id === selectedDoctor);
    if (!doctor) return;

    const newConsultation: Consultation = {
      id: Date.now().toString(),
      doctorName: doctor.name,
      specialty: doctor.specialty,
      date: selectedDate,
      time: selectedSlot,
      status: "scheduled"
    };

    setConsultations([...consultations, newConsultation]);
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setSelectedDate("");
    setShowBooking(false);
    alert("✅ Consultation booked successfully!");
  };

  const cancelConsultation = (id: string) => {
    setConsultations(consultations.map(c =>
      c.id === id ? { ...c, status: "cancelled" } : c
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return "📅";
      case "completed":
        return "✓";
      case "cancelled":
        return "✕";
      default:
        return "•";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <DashboardHeader title="Doctor Consultation" showBack={true} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <h1 className="text-4xl font-bold mb-2">👨‍⚕️ Doctor Consultation</h1>
          <p className="text-blue-100 text-lg">Connect with healthcare professionals for personalized advice</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Upcoming Consultations */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">My Consultations</h2>
                <button
                  onClick={() => setShowBooking(!showBooking)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  {showBooking ? "Cancel" : "+ Book Now"}
                </button>
              </div>

              {showBooking && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Book a Consultation</h3>
                  
                  <div className="space-y-4">
                    {/* Select Date */}
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">Select Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    {/* Select Doctor */}
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">Select Doctor</label>
                      <div className="grid gap-3">
                        {availableDoctors.map(doctor => (
                          <div
                            key={doctor.id}
                            onClick={() => setSelectedDoctor(doctor.id)}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                              selectedDoctor === doctor.id
                                ? "border-blue-600 bg-blue-50"
                                : "border-gray-200 bg-white hover:border-blue-300"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-900">{doctor.name}</h4>
                                <p className="text-sm text-gray-600">{doctor.specialty}</p>
                                <p className="text-sm text-yellow-600">⭐ {doctor.rating}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Select Time Slot */}
                    {selectedDoctor && (
                      <div>
                        <label className="block text-gray-700 font-semibold mb-2">Available Time Slots</label>
                        <div className="grid grid-cols-3 gap-2">
                          {availableDoctors.find(d => d.id === selectedDoctor)?.availableSlots.map(slot => (
                            <button
                              key={slot}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2 px-3 rounded-lg font-semibold transition ${
                                selectedSlot === slot
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={bookConsultation}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                      ✓ Confirm Booking
                    </button>
                  </div>
                </div>
              )}

              {/* Consultations List */}
              <div className="space-y-4">
                {consultations.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No consultations booked yet</p>
                ) : (
                  consultations.map(consultation => (
                    <div
                      key={consultation.id}
                      className="flex items-start justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-200 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900">{consultation.doctorName}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(consultation.status)}`}>
                            {getStatusIcon(consultation.status)} {consultation.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">🏥 {consultation.specialty}</p>
                        <p className="text-sm text-gray-600">📅 {consultation.date} at {consultation.time}</p>
                      </div>
                      {consultation.status === "scheduled" && (
                        <button
                          onClick={() => cancelConsultation(consultation.id)}
                          className="text-red-600 hover:text-red-700 font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Doctors Directory */}
          <div className="bg-white rounded-2xl shadow-lg p-8 h-fit">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">👥 Featured Doctors</h3>
            <div className="space-y-4">
              {availableDoctors.map(doctor => (
                <div key={doctor.id} className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-200 transition cursor-pointer">
                  <h4 className="font-semibold text-gray-900">{doctor.name}</h4>
                  <p className="text-sm text-gray-600">{doctor.specialty}</p>
                  <p className="text-sm text-yellow-600 mt-2">⭐ {doctor.rating}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <DashboardFooter />
    </div>
  );
}
