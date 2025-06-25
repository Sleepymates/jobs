import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, CheckCircle, BarChart3, Clock, Brain, Users, Check, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/button';
import { Card } from '../components/ui/Card';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle, AnimatedSubtitle } from '../components/ui/typography';
import { TestimonialsSection } from '../components/ui/testimonials-with-marquee';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [openFaqIndex, setOpenFaqIndex] = React.useState<number | null>(null);

  const features = [
    {
      icon: <FileText className="h-8 w-8 text-gray-600 dark:text-gray-400" />,
      smallText: "Step 1",
      title: "Create Your Job Listing",
      description: "Easily publish a new vacancy with everything you need; role description, key requirements, and your own screening questions. The setup is quick, intuitive, and branded. You're in control, and your job post is live in minutes, not hours.",
      image: "https://i.imgur.com/F8E2LTn.jpeg"
    },
    {
      icon: <Search className="h-8 w-8 text-gray-600 dark:text-gray-400" />,
      smallText: "Step 2",
      title: "Applications with Smart Follow-Ups",
      description: "Candidates apply through a clean, branded application page tailored to your listing. After uploading their CV and motivation letter, our system generates personalized follow-up questions based on each applicant's profile. This gives you richer insights and more relevant responses - without any extra work on your side.",
      image: "https://i.imgur.com/Pe2Vz4W.jpeg"
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-gray-600 dark:text-gray-400" />,
      smallText: "Step 3",
      title: "Let AI Handle the Heavy Lifting",
      description: "Our advanced AI carefully reviews each application, scoring candidates based on experience, skills, and fit with your job. You'll receive a clear match score and a concise summary for the top applicants. It's fast, objective, and accurate - saving you hours of manual review.",
      image: "https://i.imgur.com/hdkbnDd.jpeg"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-gray-600 dark:text-gray-400" />,
      smallText: "Step 4",
      title: "Your Smart Hiring Hub",
      description: "Jump into your personal dashboard where everything is clear, simple, and ready to go. See who scored highest, filter candidates by skills or responses, and view summaries at a glance. With built-in analytics and downloadable results, you're hiring faster and making sharper, more informed decisions every step of the way.",
      image: "https://i.imgur.com/PM9H0hy.jpeg"
    }
  ];

  const pricingTiers = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for trying out our platform",
      features: [
        "1 active job posting",
        "Basic AI analysis",
        "Email notifications",
        "Standard support"
      ]
    },
    {
      name: "Professional",
      price: "$49",
      period: "/month",
      description: "Best for growing companies",
      features: [
        "5 active job postings",
        "Advanced AI analysis",
        "Custom screening questions",
        "Priority support",
        "Analytics dashboard",
        "Team collaboration"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "/month",
      description: "For large organizations",
      features: [
        "Unlimited job postings",
        "Premium AI analysis",
        "Custom branding",
        "API access",
        "Dedicated support",
        "Advanced analytics",
        "Custom integrations",
        "SLA guarantee"
      ]
    }
  ];

  const faqs = [
    {
      question: "How does the AI-powered analysis work?",
      answer: "Our AI technology analyzes candidate applications by evaluating their CV, motivation letter, and answers to custom questions. It considers factors like relevant experience, skills match, and communication quality to provide a comprehensive match score and detailed insights."
    },
    {
      question: "Can I customize the application form?",
      answer: "Yes! You can customize your application form by adding specific questions, making certain fields optional or required, and setting up custom screening criteria. This helps you gather exactly the information you need from candidates."
    },
    {
      question: "What happens after I post a job?",
      answer: "After posting a job, you'll receive a unique dashboard link and access code. You can track applications in real-time, view AI analysis results, and manage candidates all in one place. You'll also receive email notifications for new applications that match your criteria."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use enterprise-grade encryption and follow strict data protection protocols. Your data is stored securely, and we never share sensitive information with third parties. We comply with major data protection regulations to ensure your information remains confidential."
    },
    {
      question: "Can I try before subscribing?",
      answer: "Yes! Our Starter plan is completely free and includes all essential features. You can post one job listing and experience our AI-powered analysis without any commitment. Upgrade anytime when you need more features."
    },
    {
      question: "Do you offer customer support?",
      answer: "Yes, we provide customer support across all plans. Free users get standard email support, while paid plans include priority support with faster response times. Enterprise customers receive dedicated support with a named account manager."
    }
  ];

  const testimonials = [
    {
      author: {
        name: "Sarah Chen",
        handle: "@sarahhr",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
      },
      text: "HellotoHire transformed our recruitment process. We reduced hiring time by 60% and found better candidates with their AI-powered screening.",
      href: "https://twitter.com/sarahhr"
    },
    {
      author: {
        name: "Marcus Rodriguez",
        handle: "@marcustech",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
      },
      text: "The personalized follow-up questions are genius! They reveal insights about candidates that traditional applications miss completely.",
      href: "https://twitter.com/marcustech"
    },
    {
      author: {
        name: "Emily Watson",
        handle: "@emilystartup",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
      },
      text: "As a startup founder, HellotoHire saves me countless hours. The AI analysis is spot-on and helps me focus on the best candidates."
    },
    {
      author: {
        name: "David Park",
        handle: "@davidhires",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
      },
      text: "The dashboard is incredibly intuitive. I can see candidate rankings, scores, and detailed summaries all in one place. Game changer!"
    },
    {
      author: {
        name: "Lisa Thompson",
        handle: "@lisahr",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
      },
      text: "Finally, an AI tool that actually understands what makes a good candidate. The match scores are incredibly accurate."
    },
    {
      author: {
        name: "Alex Kumar",
        handle: "@alextech",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
      },
      text: "The bulk CV analysis feature is amazing. We processed 200 applications in minutes instead of days. Highly recommend!"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0 pointer-events-none">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <button
              onClick={() => navigate('/bulk-analysis')}
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 mb-8 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <span className="px-3 py-1 text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full mr-2">New</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">✨ AI-Bulk Analysis</span>
            </button>

            <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 flex flex-col items-center gap-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-white/80">
                Transform Your Recruitment Process with AI Support
              </span>
            </div>
            <motion.p 
              className="text-lg sm:text-xl text-gray-600 dark:text-gray-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Save 70% of your recruitment time - Bulk CV analysis, smart candidate ranking, and personalized follow-ups, all streamlined from Hello to Hire
            </motion.p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
              <Button 
                size="lg"
                onClick={() => navigate('/post')}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                Post a Job
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/bulk-analysis')}
              >
                Bulk Analysis
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-12 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                No monthlys fees
              </span>
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Instant results
              </span>
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
               Smarter candidate selection
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection
        title="Trusted by HR professionals worldwide"
        description="Join thousands of companies who are already transforming their recruitment with our AI platform"
        testimonials={testimonials}
      />

      {/* Features Section */}
      <section id="how-it-works" className="py-24 bg-beige-50 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-24"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <AnimatedTitle text="From Hello to Hired" />
            <AnimatedSubtitle text="Our simplified recruitment process makes finding the right candidates effortless" />
          </motion.div>

          <div className="space-y-32">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                <div className="space-y-6">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {feature.smallText}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>

                  <Button
                    onClick={() => navigate('/post')}
                    size="lg"
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Get Started Now
                  </Button>
                </div>

                <motion.div
                  className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer hover:shadow-xl transition-shadow duration-300"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate('/post')}
                >
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <AnimatedTitle text="Simple, Transparent Pricing" />
            <AnimatedSubtitle text="Choose the plan that best fits your needs" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative h-full ${tier.popular ? 'border-2 border-gray-900 dark:border-white' : ''}`}>
                  {tier.popular && (
                    <div className="absolute top-0 right-0 -translate-y-1/2 px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full">
                      Most Popular
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{tier.name}</h3>
                    <div className="flex items-baseline mb-2">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">{tier.price}</span>
                      {tier.period && (
                        <span className="ml-1 text-gray-500 dark:text-gray-400">{tier.period}</span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{tier.description}</p>
                    
                    <Button
                      variant={tier.popular ? 'default' : 'outline'}
                      className="w-full mb-6"
                      onClick={() => navigate('/post')}
                    >
                      Get Started
                    </Button>

                    <ul className="space-y-3">
                      {tier.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-gray-600 dark:text-gray-400">
                          <Check className="h-5 w-5 text-gray-900 dark:text-white mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-beige-50 dark:bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <AnimatedTitle text="Frequently Asked Questions" />
            <AnimatedSubtitle text="Everything you need to know about our platform" />
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full flex items-center justify-between py-4 px-5 text-left bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-base font-medium text-gray-900 dark:text-white">
                    {faq.question}
                  </span>
                  {openFaqIndex === index ? (
                    <Minus className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Plus className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                <AnimatePresence>
                  {openFaqIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24">
        <div className="absolute inset-0 pointer-events-none">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>

        <motion.div 
          className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <AnimatedTitle text="Ready to transform your recruitment process?" />
          <AnimatedSubtitle text="Join thousands of companies using HelloToHire to find their perfect candidates." />
          
          <div className="mt-12">
            <Button 
              size="lg"
              onClick={() => navigate('/post')}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              Get Started Now
            </Button>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;