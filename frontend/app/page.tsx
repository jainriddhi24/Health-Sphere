'use client';

import Link from 'next/link';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';

export default function Home() {
  // Initialize as false to avoid server/client markup mismatch during SSR hydration.
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    // After hydration, read client-side storage to update login state.
    const checkAuth = () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        setIsLoggedIn(!!token);
      } catch {
        setIsLoggedIn(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-2xl">HS</span>
            </div>
            <span className="text-3xl font-bold text-gray-900">HealthSphere</span>
          </div>
          <div className="hidden md:flex space-x-8">
            <a href="#features" className="text-gray-700 hover:text-blue-600 transition font-medium text-lg">Features</a>
            <a href="#why-unique" className="text-gray-700 hover:text-blue-600 transition font-medium text-lg">Why Us</a>
            <a href="#modules" className="text-gray-700 hover:text-blue-600 transition font-medium text-lg">Modules</a>
            {/* Removed public links for Nutrition and Preventive Assistant from the homepage to keep them within the user dashboard */}
          </div>
          <div className="flex gap-4">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition text-lg font-semibold">
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition text-lg font-semibold"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition text-lg font-semibold">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section with Carousel */}
      <HeroCarousel />

      {/* What is HealthSphere Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">What is HealthSphere?</h2>
              <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                HealthSphere is an AI-powered health management platform that combines intelligent insights, 
                fitness tracking, and nutrition analysis to empower your wellness journey.
              </p>
              
              {/* Counter Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <CounterCard number="10K+" label="Active Users" />
                <CounterCard number="50M+" label="Meals Tracked" />
                <CounterCard number="100K+" label="Workouts Logged" />
              </div>

              <div className="space-y-3">
                <p className="text-gray-700 flex items-center gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Real-time personalized health insights</span>
                </p>
                <p className="text-gray-700 flex items-center gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>AI-powered nutrition & fitness tracking</span>
                </p>
                <p className="text-gray-700 flex items-center gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>24/7 Health Assistant support</span>
                </p>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative h-96 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/s1.jpg"
                alt="Health tracking"
                fill
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8 justify-items-center">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition transform hover:scale-105 w-full max-w-sm">
              <div className="text-5xl mb-4 text-center">🥗</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Smart Nutrition</h3>
              <p className="text-gray-700 text-center">
                AI-powered food recognition that analyzes your meals and provides detailed nutritional insights. 
                Track calories, macros, and micronutrients effortlessly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition transform hover:scale-105 w-full max-w-sm">
              <div className="text-5xl mb-4 text-center">💪</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Workout Tracking</h3>
              <p className="text-gray-700 text-center">
                Log your exercises with detailed metrics. Get personalized workout recommendations based on 
                your fitness level and goals.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition transform hover:scale-105 w-full max-w-sm">
              <div className="text-5xl mb-4 text-center">🤖</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">AI Assistant</h3>
              <p className="text-gray-700 text-center">
                Get real-time health advice from our intelligent assistant. Ask questions about nutrition, 
                fitness, and general wellness.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition transform hover:scale-105 w-full max-w-sm">
              <div className="text-5xl mb-4 text-center">📊</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Risk Forecasting</h3>
              <p className="text-gray-700 text-center">
                Predictive analytics that forecast health risks based on your lifestyle and habits. 
                Get proactive recommendations to stay healthy.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition transform hover:scale-105 w-full max-w-sm">
              <div className="text-5xl mb-4 text-center">👥</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Community</h3>
              <p className="text-gray-700 text-center">
                Connect with others on their health journey. Share experiences, get motivated, and build 
                accountability together.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition transform hover:scale-105 w-full max-w-sm">
              <div className="text-5xl mb-4 text-center">📱</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Cross-Platform</h3>
              <p className="text-gray-700 text-center">
                Seamlessly sync across all your devices. Access your health data anytime, anywhere with 
                our responsive platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why HealthSphere is Unique Section */}
      <section id="why-unique" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Why HealthSphere is Unique</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <span className="text-xl">✓</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Advanced AI Integration</h3>
                  <p className="text-gray-700">
                    Our machine learning models provide highly accurate health predictions and personalized recommendations 
                    that improve over time.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <span className="text-xl">✓</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Holistic Health Approach</h3>
                  <p className="text-gray-700">
                    We don&apos;t just track metrics – we provide comprehensive insights connecting nutrition, fitness, 
                    mental health, and preventive care.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <span className="text-xl">✓</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Privacy First</h3>
                  <p className="text-gray-700">
                    Your health data is encrypted and securely stored. We never share your personal information 
                    without explicit consent.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                    <span className="text-xl">✓</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Real-Time Insights</h3>
                  <p className="text-gray-700">
                    Get instant feedback on your health decisions with our real-time analysis and smart notifications.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-12 text-white flex flex-col justify-center">
              <h3 className="text-3xl font-bold mb-6">Transform Your Health Today</h3>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <span className="text-2xl">⭐</span>
                  <span>Personalized health insights</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl">⭐</span>
                  <span>AI-driven recommendations</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl">⭐</span>
                  <span>Community support & motivation</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl">⭐</span>
                  <span>24/7 Health assistant access</span>
                </li>
              </ul>
              <p className="text-blue-100">
                Join thousands of users who have already transformed their health with HealthSphere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Navigation Section */}
      <section id="modules" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Explore All Modules</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Module 1 */}
            <Link href="/login" className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition transform hover:scale-105 cursor-pointer block">
              <div className="text-5xl mb-4">🥗</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Food Tracker</h3>
              <p className="text-gray-600 text-sm mb-4">
                Analyze your meals with AI and track nutrition
              </p>
              <span className="text-blue-600 font-semibold">Explore →</span>
            </Link>

            {/* Module 2 */}
            <Link href="/log-workout" className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition transform hover:scale-105 cursor-pointer block">
              <div className="text-5xl mb-4">💪</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Workout Logger</h3>
              <p className="text-gray-600 text-sm mb-4">
                Track exercises and get personalized plans
              </p>
              <span className="text-blue-600 font-semibold">Explore →</span>
            </Link>

            {/* Module 3 */}
            <Link href="/login" className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition transform hover:scale-105 cursor-pointer block">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Health Chat</h3>
              <p className="text-gray-600 text-sm mb-4">
                Chat with AI assistant for health advice
              </p>
              <span className="text-blue-600 font-semibold">Explore →</span>
            </Link>

            {/* Module 4 */}
            <Link href="/login" className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition transform hover:scale-105 cursor-pointer block">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Community</h3>
              <p className="text-gray-600 text-sm mb-4">
                Connect with health enthusiasts worldwide
              </p>
              <span className="text-blue-600 font-semibold">Explore →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Your Health?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join HealthSphere today and start your personalized health journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition transform hover:scale-105">
              Sign Up Now
            </Link>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition">
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-4">HealthSphere</h4>
              <p className="text-sm">Your personal AI-powered health companion.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#why-unique" className="hover:text-white transition">Why Us</a></li>
                <li><a href="#modules" className="hover:text-white transition">Modules</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2025 HealthSphere. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Hero Carousel Component

function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Your Personal",
      highlight: "Health Companion",
      description: "HealthSphere is an intelligent, all-in-one health management platform that combines AI-powered insights, personalized fitness tracking, nutrition analysis, and preventive health forecasting.",
      bgColor: "from-blue-500 to-blue-600",
      image: "🏥"
    },
    {
      title: "Track Your",
      highlight: "Nutrition",
      description: "AI-powered food recognition analyzes your meals and provides detailed nutritional insights. Track calories, macros, and micronutrients effortlessly with our smart nutrition tracker.",
      bgColor: "from-green-500 to-green-600",
      image: "🥗"
    },
    {
      title: "Achieve Your",
      highlight: "Fitness Goals",
      description: "Log your exercises with detailed metrics and get personalized workout recommendations based on your fitness level and goals. Build the body you've always wanted.",
      bgColor: "from-purple-500 to-purple-600",
      image: "💪"
    },
    {
      title: "Get",
      highlight: "AI Health Advice",
      description: "Chat with our intelligent AI assistant 24/7. Get real-time health advice about nutrition, fitness, and general wellness anytime you need it.",
      bgColor: "from-indigo-500 to-indigo-600",
      image: "🤖"
    },
    {
      title: "Forecast Your",
      highlight: "Health Future",
      description: "Predictive analytics forecast health risks based on your lifestyle and habits. Get proactive recommendations to stay healthy and prevent issues.",
      bgColor: "from-red-500 to-red-600",
      image: "📊"
    },
    {
      title: "Join Our",
      highlight: "Health Community",
      description: "Connect with others on their health journey. Share experiences, get motivated, and build accountability together with thousands of health enthusiasts.",
      bgColor: "from-pink-500 to-pink-600",
      image: "👥"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const slide = slides[currentSlide];

  return (
    <section className={`relative bg-gradient-to-r ${slide.bgColor} text-white py-32 overflow-hidden transition-all duration-500`}>
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              {slide.title} <span className="text-white drop-shadow-lg">{slide.highlight}</span>
            </h1>
            <p className="text-xl text-white/90 leading-relaxed">
              {slide.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/login" className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition transform hover:scale-105 inline-block text-center">
                Get Started Now
              </Link>
              <button className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition transform hover:scale-105">
                Learn More
              </button>
            </div>
          </div>

          {/* Visual Display */}
          <div className="flex justify-center items-center">
            <div className="relative w-80 h-80">
              {/* Outer glowing ring */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full blur-2xl"></div>
              
              {/* Main card */}
              <div className={`absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-3xl backdrop-blur-lg p-8 flex flex-col items-center justify-center border border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105`}>
                {/* Feature Icon - Large and colorful */}
                <div className="text-8xl mb-6 drop-shadow-2xl animate-pulse">
                  {slide.image}
                </div>
                
                {/* Feature name */}
                <p className="text-2xl font-bold text-white text-center drop-shadow-lg">
                  {slide.highlight}
                </p>
                
                {/* Decorative dots */}
                <div className="flex gap-2 mt-6">
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                  <div className="w-2 h-2 bg-white/40 rounded-full"></div>
                  <div className="w-2 h-2 bg-white/20 rounded-full"></div>
                </div>
              </div>
              
              {/* Floating particles effect */}
              <div className="absolute top-10 left-10 w-4 h-4 bg-white/40 rounded-full animate-ping"></div>
              <div className="absolute bottom-10 right-10 w-3 h-3 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-4 z-20">
        {/* Previous Button */}
        <button
          onClick={prevSlide}
          className="bg-white/30 hover:bg-white/50 text-white p-2 rounded-full transition"
          aria-label="Previous slide"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Slide Indicators */}
        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`rounded-full transition ${
                index === currentSlide
                  ? 'bg-white w-3 h-3'
                  : 'bg-white/50 w-2 h-2 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={nextSlide}
          className="bg-white/30 hover:bg-white/50 text-white p-2 rounded-full transition"
          aria-label="Next slide"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
}

// Counter Card Component
function CounterCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center hover:shadow-lg transition">
      <p className="text-3xl font-bold text-blue-600 mb-2">{number}</p>
      <p className="text-gray-700 text-sm font-medium">{label}</p>
    </div>
  );
}
