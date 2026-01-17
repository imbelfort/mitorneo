import AuthPanel from "@/components/auth/auth-panel";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import Link from "next/link";
import {
  Trophy,
  Users,
  BarChart3,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Calendar
} from "lucide-react";
import HeroCarousel from "@/components/ui/hero-carousel";
import Image from "next/image";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // This would ideally come from the database
  const activeTournaments = [
    {
      id: "demo-1",
      name: "Torneo Abierto Clausura 2026",
      sport: "Ráquet",
      date: "25 de Enero"
    },
    {
      id: "demo-2",
      name: "Liga Nacional de Frontón",
      sport: "Frontón",
      date: "10 de Febrero"
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50" suppressHydrationWarning>
      {/* Hero Section */}
      <section className="relative h-[85vh] w-full items-center flex">
        <HeroCarousel />

        <div className="container relative z-20 mx-auto px-6 pt-20">
          <div className="max-w-3xl">
            <h1 className="animate-fade-up text-5xl font-extrabold leading-tight text-white sm:text-7xl">
              Organizá tu torneo.
              <span className="mt-2 block bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Competí. Ganá.
              </span>
            </h1>
            <p className="animate-fade-up mt-6 max-w-xl text-lg text-slate-200 delay-100">
              Creá torneos de ráquet y frontón en minutos, gestioná jugadores, fixtures y resultados desde cualquier lugar.
            </p>

            <div className="animate-fade-up mt-8 flex flex-wrap gap-4 delay-200">
              {session?.user ? (
                <Link
                  href="/admin/tournaments"
                  className="group flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-indigo-500/30 hover:scale-105 active:scale-95"
                >
                  <Trophy className="h-5 w-5" />
                  Crear Torneo
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="group flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-indigo-500/30 hover:scale-105 active:scale-95"
                >
                  <Trophy className="h-5 w-5" />
                  Crear Torneo
                </Link>
              )}

              <Link
                href="#upcoming"
                className="group flex items-center gap-2 rounded-full bg-white/10 px-8 py-3.5 text-base font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
              >
                Ver torneos activos
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {!session && (
            <div className="animate-fade-up absolute bottom-24 right-6 delay-300 hidden xl:block">
              <div className="w-[380px] rounded-2xl bg-white/10 p-4 backdrop-blur-lg shadow-2xl border border-white/20">
                <AuthPanel session={session} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              ¿Qué podés hacer con MiTorneo?
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Todo lo que necesitas para gestionar tu competencia en un solo lugar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Trophy className="h-8 w-8 text-indigo-600" />,
                title: "Crear torneos",
                desc: "Definí categorías, fechas, sedes y formato de competencia."
              },
              {
                icon: <Users className="h-8 w-8 text-indigo-600" />,
                title: "Gestión de jugadores",
                desc: "Inscripciones, listas y control de participantes."
              },
              {
                icon: <BarChart3 className="h-8 w-8 text-indigo-600" />,
                title: "Resultados en vivo",
                desc: "Cargá marcadores y tablas de posiciones al instante."
              },
              {
                icon: <Smartphone className="h-8 w-8 text-indigo-600" />,
                title: "Multiplataforma",
                desc: "Acceso optimizado desde cualquier dispositivo."
              }
            ].map((feature, idx) => (
              <div key={idx} className="group rounded-2xl p-8 bg-slate-50 border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="mb-6 h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialty Section */}
      <section className="py-20 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('/hero_pattern.svg')]"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-1.5 text-indigo-300 font-medium mb-6 border border-indigo-500/20">
                <ShieldCheck className="h-4 w-4" />
                <span>Especializado</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                Pensado para <br />
                <span className="text-indigo-400">Ráquet y Frontón</span>
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                MiTorneo está diseñada específicamente para respetar las reglas de juego, los formatos de competencia y las dinámicas únicas de los torneos de ráquet y frontón. Olvidate de adaptar soluciones genéricas.
              </p>
              <div className="flex gap-6">
                {["Reglas oficiales", "Fixtures automáticos", "Sedes múltiples"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-200 font-medium">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative h-[400px] w-full rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <Image
                src="/hero/fotodos.jpeg"
                alt="Fronton action"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-indigo-900/20 mix-blend-multiply" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">¿Cómo funciona?</h2>
            <p className="mt-4 text-slate-600">Simplicidad en cada paso del proceso</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: "01", title: "Creá tu torneo", desc: "Configurá los detalles básicos y categorías." },
              { step: "02", title: "Inscribí jugadores", desc: "Habilitá el registro o carga manual." },
              { step: "03", title: "Jugá y publicá", desc: "Generá cruces y actualizá resultados." }
            ].map((step, idx) => (
              <div key={idx} className="relative p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="text-6xl font-black text-slate-100 absolute top-4 right-4 select-none">
                  {step.step}
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Tournaments */}
      <section id="upcoming" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Torneos Destacados</h2>
              <p className="mt-2 text-slate-600">Próximos eventos en la plataforma</p>
            </div>
            <Link href="/tournaments" className="text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1">
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTournaments.map((tour) => (
              <div key={tour.id} className="group overflow-hidden rounded-2xl bg-white border border-slate-200 hover:shadow-lg transition-all">
                <div className="h-40 bg-slate-100 relative">
                  <Image
                    src={`/hero/fototres.jpeg`}
                    alt={tour.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                      {tour.sport}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {tour.date}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 line-clamp-1">
                    {tour.name}
                  </h3>
                  <Link
                    href={`/tournaments/${tour.id}`}
                    className="block w-full rounded-xl bg-slate-900 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Ver Torneo
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 bg-indigo-600 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero/fotocuatro.jpeg')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 to-indigo-600/90"></div>

        <div className="container relative z-10 mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6 sm:text-5xl">
            ¿Listo para organizar tu próximo torneo?
          </h2>
          <p className="text-indigo-100 text-xl max-w-2xl mx-auto mb-10">
            Unite a la comunidad de organizadores que ya usan MiTorneo para llevar sus competencias al siguiente nivel.
          </p>
          <Link
            href={session ? "/admin/tournaments" : "/register"}
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-indigo-600 shadow-xl transition-all hover:bg-slate-50 hover:scale-105"
          >
            Empezar ahora
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Mobile Auth Panel (visible only on small screens) */}
      {!session && (
        <section className="xl:hidden py-12 bg-slate-50 border-t border-slate-200">
          <div className="container mx-auto px-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">Acceder a mi cuenta</h3>
            <div className="max-w-md mx-auto">
              <AuthPanel session={session} />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
