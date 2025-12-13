"use client"

import React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Brain, TrendingUp, Users, Sparkles, Zap, Target, BarChart3 } from "lucide-react"
import { HeroSection } from "@/components/ui/HeroSection"
import { GlassCard } from "@/components/ui/GlassCard"
import { AnimatedButton } from "@/components/ui/AnimatedButton"
import { SectionHeader } from "@/components/ui/SectionHeader"

const features = [
  {
    title: "ML Predictions",
    description: "Advanced machine learning models predict player points with precision",
    icon: Brain,
    gradient: "from-purple-500 via-pink-500 to-purple-500",
    href: "/dashboard",
    delay: 0.1,
  },
  {
    title: "XG Score",
    description: "Comprehensive squad evaluation using expected goals and assists",
    icon: TrendingUp,
    gradient: "from-blue-500 via-cyan-500 to-blue-500",
    href: "/dashboard",
    delay: 0.2,
  },
  {
    title: "Squad Optimizer",
    description: "AI-powered optimization for the perfect 15-player squad",
    icon: Users,
    gradient: "from-green-500 via-emerald-500 to-green-500",
    href: "/optimize",
    delay: 0.3,
  },
  {
    title: "AI Copilot",
    description: "Natural language advisor for intelligent transfer decisions",
    icon: Sparkles,
    gradient: "from-yellow-500 via-orange-500 to-yellow-500",
    href: "/copilot",
    delay: 0.4,
  },
  {
    title: "Advanced Analytics",
    description: "Deep insights into player performance and team statistics",
    icon: BarChart3,
    gradient: "from-cyan-500 via-blue-500 to-cyan-500",
    href: "/analytics",
    delay: 0.5,
  },
  {
    title: "Transfer Market",
    description: "Smart player search and comparison with AI recommendations",
    icon: Target,
    gradient: "from-pink-500 via-purple-500 to-pink-500",
    href: "/transfers",
    delay: 0.6,
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-ai-darker relative overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/background.mp4" type="video/mp4" />
        </video>
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-premier opacity-30" />
      </div>

      {/* Hero Section */}
      <HeroSection
        title={
          <>
            <span className="gradient-text">XGenius</span>
            <br />
            <span className="text-white text-5xl md:text-6xl">Fantasy Premier League</span>
          </>
        }
        subtitle="AI-Powered Platform"
        description="The Premier League's most advanced fantasy football optimization platform. Powered by machine learning, driven by data, designed for champions."
        primaryAction={{
          label: "Get Started",
          onClick: () => (window.location.href = "/dashboard"),
        }}
        secondaryAction={{
          label: "Learn More",
          onClick: () => {
            document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
          },
        }}
        background="gradient"
        className="min-h-screen"
      />

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <SectionHeader
            title="Powerful Features"
            subtitle="Everything you need to dominate Fantasy Premier League"
            className="mb-12"
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: feature.delay, duration: 0.5 }}
              >
                <Link href={feature.href} className="block group">
                  <GlassCard
                    glow
                    hover
                    delay={feature.delay}
                    className="h-full group-hover:scale-105 group-hover:shadow-glow transition-all duration-300"
                  >
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-20 group-hover:opacity-40 transition-opacity mb-4 inline-block group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-ai-primary transition-colors break-words">
                      {feature.title}
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed break-words">
                      {feature.description}
                    </p>
                    <div className="mt-4 flex items-center text-ai-primary text-sm font-medium gap-1 group-hover:gap-2 transition-all">
                      <span>Learn more</span>
                      <ArrowRight className="h-4 w-4 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <GlassCard glow className="p-12">
              <Zap className="h-16 w-16 text-ai-primary mx-auto mb-6" />
              <h2 className="text-4xl font-bold gradient-text mb-4">
                Ready to Transform Your FPL Experience?
              </h2>
              <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of managers using AI to make smarter decisions, optimize their squads, and climb the ranks.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <AnimatedButton
                  variant="primary"
                  size="lg"
                  glow
                  onClick={() => (window.location.href = "/dashboard")}
                  className="flex items-center gap-2"
                >
                  <span>Start Optimizing</span>
                  <ArrowRight className="h-5 w-5 flex-shrink-0" />
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  size="lg"
                  onClick={() => (window.location.href = "/settings")}
                >
                  Configure Team
                </AnimatedButton>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
