import Link from "next/link";
import { MessageCircle, ExternalLink, Trophy } from "lucide-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    {/* About Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-white mb-4">
                            <Trophy className="h-6 w-6 text-indigo-400" />
                            <span className="text-xl font-bold tracking-tight">MiTorneo</span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400">
                            La plataforma integral para la gestión profesional de torneos de ráquet y frontón.
                            Simplificamos la organización para que te enfoques en lo que importa: el juego.
                        </p>
                    </div>

                    {/* Contact Section */}
                    <div className="space-y-4">
                        <h3 className="text-white font-semibold text-lg">Contacto</h3>
                        <div className="flex flex-col gap-3">
                            <a
                                href="https://wa.me/59160021284"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 text-slate-400 hover:text-emerald-400 transition-colors group"
                            >
                                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-[#25D366] transition-colors duration-300">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="h-5 w-5 text-slate-300 group-hover:text-white transition-colors"
                                    >
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                </div>
                                <span className="font-medium">+591 600 21284</span>
                            </a>
                        </div>
                    </div>

                    {/* Developer Section */}
                    <div className="space-y-4">
                        <h3 className="text-white font-semibold text-lg">Desarrollo</h3>
                        <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                            <p className="text-sm text-slate-400 mb-3">
                                Plataforma diseñada y desarrollada con altos estándares de calidad por:
                            </p>
                            <a
                                href="https://migartec.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                            >
                                Migartec.com
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
                    <p>© {currentYear} MiTorneo. Todos los derechos reservados.</p>
                    <div className="flex gap-6">
                        <Link href="/terms" className="hover:text-slate-300 transition-colors">Términos</Link>
                        <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacidad</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
