
import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
    const lastUpdated = new Date().toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <main className="min-h-screen bg-slate-50 py-12 px-6">
            <div className="mx-auto max-w-3xl">
                <Link
                    href="/"
                    className="mb-8 inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al inicio
                </Link>

                <div className="rounded-3xl bg-white p-6 sm:p-12 shadow-sm ring-1 ring-slate-200">
                    <div className="mb-10 flex items-center gap-4 border-b border-slate-100 pb-8">
                        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                            <Shield className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                Política de Privacidad
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Última actualización: {lastUpdated}
                            </p>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none text-slate-600 prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-indigo-600">
                        <p>
                            En <strong>MiTorneo</strong>, nos tomamos muy en serio la privacidad de tus datos.
                            Esta política describe cómo recopilamos y utilizamos la información personal que nos proporcionas.
                        </p>

                        <h3>1. Uso de la Información</h3>
                        <p>
                            La información recopilada a través de nuestra plataforma se utiliza <strong>exclusivamente</strong> para los fines relacionados con la organización, gestión y ejecución de los torneos deportivos.
                        </p>
                        <ul>
                            <li>
                                <strong>Gestión de Inscripciones:</strong> Para registrar a los jugadores en las categorías correspondientes.
                            </li>
                            <li>
                                <strong>Comunicación:</strong> Para enviarte notificaciones sobre horarios de partidos, cambios en el fixture o resultados.
                            </li>
                            <li>
                                <strong>Estadísticas del Torneo:</strong> Para mostrar tablas de posiciones, resultados y rankings.
                            </li>
                        </ul>

                        <h3>2. No Compartimos tu Información</h3>
                        <p>
                            Tus datos personales (como nombre, teléfono o correo electrónico) <strong>no serán vendidos, alquilados ni compartidos</strong> con terceros para fines comerciales, publicitarios o de marketing.
                        </p>
                        <p>
                            La información pública visible en la plataforma se limita a lo estrictamente necesario para el desarrollo del torneo (ej. Nombre del jugador en el cuadro de partidos).
                        </p>

                        <h3>3. Seguridad de los Datos</h3>
                        <p>
                            Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos contra el acceso no autorizado, la pérdida o la alteración. Almacenamos la información en bases de datos seguras y el acceso está restringido únicamente al personal necesario para la operación del servicio.
                        </p>

                        <h3>4. Derechos del Usuario</h3>
                        <p>
                            Tienes derecho a solicitar el acceso, rectificación o eliminación de tus datos personales de nuestros registros en cualquier momento. Si deseas ejercer estos derechos, por favor contáctanos a través de los canales oficiales.
                        </p>

                        <h3>5. Contacto</h3>
                        <p>
                            Si tienes preguntas sobre esta política de privacidad, puedes contactarnos directamente al número de soporte o a través de nuestros canales oficiales.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
