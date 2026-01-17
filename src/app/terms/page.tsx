
import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
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

                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-12">
                    <div className="mb-10 flex items-center gap-4 border-b border-slate-100 pb-8">
                        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                            <FileText className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                Términos y Condiciones
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Última actualización: {lastUpdated}
                            </p>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none text-slate-600 prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-indigo-600">
                        <p>
                            Bienvenido a <strong>MiTorneo</strong>. Al acceder y utilizar nuestra plataforma para la gestión de torneos deportivos, aceptas cumplir con los siguientes términos y condiciones.
                        </p>

                        <h3>1. Descripción del Servicio</h3>
                        <p>
                            MiTorneo es una herramienta tecnológica diseñada para facilitar la organización de torneos de ráquet, frontón y otros deportes. La plataforma permite la creación de eventos, gestión de inscripciones, generación de fixtures y publicación de resultados.
                        </p>

                        <h3>2. Uso Aceptable</h3>
                        <p>
                            Te comprometes a utilizar la plataforma únicamente para fines legítimos relacionados con la organización y participación en eventos deportivos. Queda prohibido el uso del servicio para actividades ilegales, fraudulentas o que violen los derechos de terceros.
                        </p>

                        <h3>3. Responsabilidad de los Organizadores</h3>
                        <p>
                            Los organizadores de torneos son los únicos responsables de la veracidad de la información publicada sobre sus eventos (fechas, premios, reglas). MiTorneo actúa como un facilitador tecnológico y no se hace responsable por la cancelación de eventos o discrepancias en la organización de los mismos.
                        </p>

                        <h3>4. Privacidad y Datos</h3>
                        <p>
                            Como se establece en nuestra Política de Privacidad, los datos recopilados (nombres, documentos, datos de contacto) se utilizan <strong>exclusivamente</strong> para la gestión operativa del torneo. Al registrarte, aceptas que tu nombre y resultados deportivos puedan ser visibles públicamente en el contexto de las tablas de posiciones y fixtures del torneo.
                        </p>

                        <h3>5. Propiedad Intelectual</h3>
                        <p>
                            Todos los derechos sobre el software, diseño, logotipos y código de MiTorneo son propiedad exclusiva de sus desarrolladores. No se permite la copia, modificación o distribución no autorizada de nuestra plataforma.
                        </p>

                        <h3>6. Modificaciones</h3>
                        <p>
                            Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigencia desde su publicación en esta página. Se recomienda revisar estos términos periódicamente.
                        </p>

                        <h3>7. Contacto</h3>
                        <p>
                            Para cualquier duda o consulta referente a estos términos, puedes ponerte en contacto con nuestro equipo de soporte a través de los canales habilitados en la plataforma.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
