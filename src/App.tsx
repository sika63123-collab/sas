import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Phone, Map as MapIcon, Layers, Crosshair, Menu, X, ArrowUpRight, Ruler, Compass, Facebook, Instagram, Home, Briefcase, Wrench, MessageCircle } from 'lucide-react';

export default function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-amber-500 selection:text-white overflow-x-hidden">
      
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 text-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
              <Compass size={28} />
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-900">محمد المعناوي</span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 font-bold text-slate-600">
            <a href="#about" className="hover:text-amber-600 transition-colors">مين أنا؟</a>
            <a href="#services" className="hover:text-amber-600 transition-colors">خدماتي</a>
            <a href="#equipment" className="hover:text-amber-600 transition-colors">أجهزتنا</a>
            <a href="#contact" className="hover:text-amber-600 transition-colors">كلمنا</a>
          </div>
          
          <div className="hidden md:block">
            <a href="#contact" className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-amber-500 hover:text-slate-900 transition-all shadow-lg hover:shadow-amber-500/30 flex items-center gap-2">
              كلمني دلوقتي
              <ArrowUpRight size={18} />
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-slate-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6 text-2xl font-black text-slate-900">
              <a href="#about" onClick={() => setMobileMenuOpen(false)}>مين أنا؟</a>
              <a href="#services" onClick={() => setMobileMenuOpen(false)}>خدماتي</a>
              <a href="#equipment" onClick={() => setMobileMenuOpen(false)}>أجهزتنا</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)}>كلمنا</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="mt-4 px-6 py-4 bg-amber-500 text-slate-900 text-center rounded-2xl">كلمني دلوقتي</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-topo opacity-40"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-bold mb-6 border border-amber-200"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                دقة بالمللي، وشغل يعتمد عليه
              </motion.div>
              <h1 className="text-5xl lg:text-7xl font-black leading-[1.2] text-slate-900 mb-6">
                شغل مساحة <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
                  مظبوط بالمللي.
                </span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 max-w-lg leading-relaxed font-medium">
                خبرة سنين في الرفع والتوقيع المساحي، وحساب الكميات. بقدملك شغل هندسي "على الفرازة" بأحدث الأجهزة عشان تضمن إن مشروعك يطلع صح من أول يوم.
              </p>
              <div className="flex flex-wrap gap-4">
                <motion.a 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href="#contact" 
                  className="px-8 py-4 bg-amber-500 text-slate-900 font-black text-lg rounded-2xl hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/30 flex items-center gap-2"
                >
                  يلا نبدأ شغل
                  <MapPin size={22} />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href="#services" 
                  className="px-8 py-4 bg-white text-slate-800 font-bold text-lg rounded-2xl hover:bg-slate-50 transition-all shadow-sm border-2 border-slate-200 flex items-center gap-2"
                >
                  شوف خدماتي
                </motion.a>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              <div className="aspect-square md:aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl relative border-8 border-white bg-slate-200">
                <img 
                  src="https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?q=80&w=1200&auto=format&fit=crop" 
                  alt="Surveying and Engineering" 
                  className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                
                {/* Floating Badge */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute bottom-4 right-4 md:bottom-8 md:right-8 bg-white/60 backdrop-blur-xl p-4 md:p-5 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] flex items-center gap-4 md:gap-5 border border-white/60"
                >
                  <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                    <Crosshair size={28} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-bold">نسبة الخطأ</p>
                    <p className="text-2xl font-black text-slate-900">0.0%</p>
                  </div>
                </motion.div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-topo opacity-10"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative"
            >
              <div className="aspect-[3/4] rounded-[3rem] overflow-hidden border-4 border-slate-800">
                <img 
                  src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1000&auto=format&fit=crop" 
                  alt="Engineer Portrait" 
                  className="object-cover w-full h-full grayscale hover:grayscale-0 transition-all duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-amber-500 text-slate-900 p-8 rounded-[2rem] shadow-2xl max-w-xs">
                <p className="text-4xl font-black mb-2">+7</p>
                <p className="font-bold text-lg">سنين خبرة في السوق المصري والمشاريع القومية.</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-amber-500 font-bold text-xl mb-2">مين محمد المعناوي؟</h2>
              <h3 className="text-4xl md:text-5xl font-black mb-8 leading-tight">المساحة مش مجرد أرقام، دي <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">روح المشروع</span></h3>
              <div className="space-y-6 text-lg text-slate-300 leading-relaxed font-medium">
                <p>
                  أهلاً بيك! أنا محمد المعناوي، مهندس مساحة مصري، بشتغل في المجال ده بشغف وحب للتفاصيل. من أول يوم نزلت فيه الموقع، أدركت إن المساحة مش مجرد جهاز وترايبود، دي الأساس اللي بيتبني عليه أي مشروع ناجح.
                </p>
                <p>
                  لو الأساس مظبوط، العمارة كلها بتطلع صح. شاركت في أكتر من 50 مشروع متنوع، من طرق وكباري لمشاريع إسكان وبنية تحتية. 
                </p>
                <p>
                  هدفي دايماً إني أريّح العميل وأشيل من عليه هم المقاسات والكميات، وأقدمله شغل "على الفرازة" يريحه في التنفيذ وميخليهوش يرجع يعيد حاجة تاني.
                </p>
              </div>
              
              <div className="mt-10 flex gap-6">
                <div className="flex flex-col gap-2">
                  <span className="text-3xl font-black text-white">100%</span>
                  <span className="text-slate-400 font-bold">التزام بالمواعيد</span>
                </div>
                <div className="w-px bg-slate-700"></div>
                <div className="flex flex-col gap-2">
                  <span className="text-3xl font-black text-white">+50</span>
                  <span className="text-slate-400 font-bold">مشروع متسلم</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-amber-500 font-bold text-xl mb-2">خدماتي</h2>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">بقدملك إيه في الموقع؟</h3>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg font-medium">كل اللي تحتاجه في شغل المساحة، من أول رفع الأرض لحد تسليم المشروع، بأحدث الأجهزة وأعلى دقة.</p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="flex overflow-x-auto pb-12 -mx-6 px-6 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:pb-0 md:mx-0 md:px-0 gap-6 md:gap-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
          >
            {[
              {
                icon: <MapIcon size={32} strokeWidth={1.5} />,
                title: "الرفع المساحي",
                desc: "بنرفعلك حتة الأرض أو المشروع ونطلعلك خريطة كنتورية دقيقة جداً توضح كل تفصيلة ومقاس."
              },
              {
                icon: <Crosshair size={32} strokeWidth={1.5} />,
                title: "التوقيع المساحي",
                desc: "بناخد اللوح الهندسية ونوقعها على الطبيعة بدقة متناهية عشان الشغل يطلع زي الكتاب ما بيقول."
              },
              {
                icon: <Layers size={32} strokeWidth={1.5} />,
                title: "حساب الكميات",
                desc: "بنحسبلك كميات الحفر والردم بالظبط عشان تعرف ميزانيتك وتكلفتك من غير أي هدر أو مصاريف زيادة."
              },
              {
                icon: <Ruler size={32} strokeWidth={1.5} />,
                title: "مساحة الطرق",
                desc: "شغل مساحة متخصص لمسارات الطرق، الكباري، وشبكات الصرف والمية بأعلى معايير الجودة."
              },
              {
                icon: <MapPin size={32} strokeWidth={1.5} />,
                title: "تحديد الملكيات",
                desc: "بنحدد حدود أرضك ونفصل التداخلات مع الجيران بناءً على الورق الرسمي والصكوك."
              },
              {
                icon: <Compass size={32} strokeWidth={1.5} />,
                title: "نظم الـ GIS",
                desc: "بنجمع ونحلل البيانات المكانية ونعملك قواعد بيانات جغرافية متكاملة لمشروعك."
              }
            ].map((service, idx) => (
              <motion.div 
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -10 }}
                className="min-w-[85vw] sm:min-w-[300px] md:min-w-0 snap-center p-8 rounded-[2rem] bg-slate-50 border-2 border-slate-100 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-500/10 transition-all group relative overflow-hidden flex-shrink-0 md:flex-shrink"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full -z-10 group-hover:bg-amber-500/20 transition-colors"></div>
                
                {/* Refined Icon Container */}
                <div className="relative w-16 h-16 mb-8">
                  <div className="absolute inset-0 bg-amber-200 rounded-2xl rotate-6 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 opacity-50"></div>
                  <div className="absolute inset-0 bg-white rounded-2xl shadow-sm flex items-center justify-center text-amber-600 group-hover:-translate-y-1 group-hover:shadow-md transition-all duration-300 border border-amber-50">
                    {service.icon}
                  </div>
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-4">{service.title}</h3>
                <p className="text-slate-600 leading-relaxed font-medium text-lg">{service.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Equipment Section */}
      <section id="equipment" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1 relative"
            >
              <div className="grid grid-cols-2 gap-6">
                <motion.img 
                  whileHover={{ scale: 1.05 }}
                  src="https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?q=80&w=800&auto=format&fit=crop" 
                  alt="Total Station" 
                  className="rounded-[2rem] shadow-xl border-4 border-white" 
                  referrerPolicy="no-referrer" 
                />
                <motion.img 
                  whileHover={{ scale: 1.05 }}
                  src="https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?q=80&w=800&auto=format&fit=crop" 
                  alt="GPS Rover" 
                  className="rounded-[2rem] shadow-xl border-4 border-white mt-12" 
                  referrerPolicy="no-referrer" 
                />
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <h2 className="text-amber-500 font-bold text-xl mb-2">أدواتنا</h2>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">شغالين بأحدث الأجهزة</h3>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed font-medium">
                مبنهزرش في الدقة، عشان كده بنعتمد على أحدث أجهزة المساحة في السوق لضمان سرعة الإنجاز ودقة مفيهاش غلطة. التكنولوجيا هي سلاحنا عشان نطلعلك شغل بيرفكت.
              </p>
              <ul className="space-y-6">
                {[
                  "محطات الرصد المتكاملة (Total Stations) عالية الدقة.",
                  "أجهزة تحديد المواقع العالمية (RTK GPS / GNSS).",
                  "موازين القامة الرقمية (Digital Levels).",
                  "برامج هندسية متقدمة (AutoCAD Civil 3D, ArcGIS)."
                ].map((item, idx) => (
                  <motion.li 
                    key={idx} 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-4 text-slate-800 font-bold text-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center flex-shrink-0 shadow-md">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-slate-900 rounded-[3rem] p-8 md:p-16 text-center relative overflow-hidden shadow-2xl border border-slate-800"
          >
            <div className="absolute inset-0 bg-topo opacity-10"></div>
            
            {/* Animated background glow */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ repeat: Infinity, duration: 5 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/20 rounded-full blur-[100px]"
            ></motion.div>

            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-black text-white mb-6">عندك مشروع ومحتاج شغل مساحة صح؟</h2>
              <p className="text-slate-300 mb-12 max-w-2xl mx-auto text-xl font-medium leading-relaxed">
                أنا موجود عشان أساعدك تنجز مشروعك بأعلى جودة وفي أسرع وقت. كلمني دلوقتي ونظبط كل التفاصيل.
              </p>
              
              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-6">
                <motion.a 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href="tel:+201287424741" 
                  className="px-8 py-4 bg-amber-500 text-slate-900 font-black rounded-2xl hover:bg-amber-400 transition-all flex items-center justify-center gap-3 text-xl shadow-xl shadow-amber-500/20 w-full sm:w-auto"
                >
                  <Phone size={26} />
                  01287424741
                </motion.a>
                
                <motion.a 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href="https://www.facebook.com/share/1DcRt1vQbj/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-[#1877F2] text-white font-bold rounded-2xl hover:bg-[#1877F2]/90 transition-all flex items-center justify-center gap-3 text-xl shadow-xl shadow-[#1877F2]/20 w-full sm:w-auto"
                >
                  <Facebook size={26} />
                  فيسبوك
                </motion.a>

                <motion.a 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href="https://www.instagram.com/mo7med_741?igsh=MWl5cjNienFwdXMwMQ==" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white font-bold rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-3 text-xl shadow-xl shadow-[#bc1888]/20 w-full sm:w-auto"
                >
                  <Instagram size={26} />
                  إنستجرام
                </motion.a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Floating Action Button (FAB) */}
      <a 
        href="tel:+201287424741"
        className="fixed bottom-24 md:bottom-8 left-6 z-50 w-14 h-14 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-110 transition-transform"
      >
        <span className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-20"></span>
        <Phone size={24} className="fill-slate-900" />
      </a>

      {/* Mobile Bottom Navigation (Glassmorphism) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 pointer-events-none">
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-3xl flex justify-between items-center px-6 py-3 pointer-events-auto">
          <a href="#" className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-500 transition-colors">
            <Home size={20} />
            <span className="text-[10px] font-bold">الرئيسية</span>
          </a>
          <a href="#services" className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-500 transition-colors">
            <Briefcase size={20} />
            <span className="text-[10px] font-bold">خدماتي</span>
          </a>
          <a href="#equipment" className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-500 transition-colors">
            <Wrench size={20} />
            <span className="text-[10px] font-bold">أجهزتنا</span>
          </a>
          <a href="#contact" className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-500 transition-colors">
            <MessageCircle size={20} />
            <span className="text-[10px] font-bold">تواصل</span>
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-10 pb-28 md:pb-10 border-t border-slate-200 bg-slate-50 text-center text-slate-500 font-bold">
        <p>© {new Date().getFullYear()} سيد محمد مؤسس الموقع. كل الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
