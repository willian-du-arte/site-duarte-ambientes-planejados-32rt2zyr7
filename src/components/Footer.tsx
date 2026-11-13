import { Link } from 'react-router-dom'
import { Compass, MapPin, Phone, Mail, Clock, Lock } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-wood-900 text-wood-100 border-t border-wood-800">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          {/* Brand & Sobre */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-wood-500 text-white flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif font-bold text-xl text-white block leading-tight">
                  Duarte
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-wood-300 block">
                  Ambientes Planejados
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-wood-200/80 leading-relaxed">
              Marcenaria e móveis sob medida em MDF em Santa Maria/RS. Projetos residenciais,
              comerciais e corporativos desenvolvidos com personalização, acabamento de alto padrão
              e visualização 3D realista.
            </p>
          </div>

          {/* Ambientes atendidos */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-base text-white tracking-wide">
              Ambientes Sob Medida
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-wood-200/80">
              <li>Cozinhas Planejadas & Ilhas</li>
              <li>Dormitórios & Closets</li>
              <li>Painéis de TV & Home Theater</li>
              <li>Banheiros & Lavabos</li>
              <li>Home Office & Escritórios</li>
              <li>Clínicas Médicas & Consultórios</li>
              <li>Mobiliário Corporativo & Lojas</li>
            </ul>
          </div>

          {/* Atendimento & Localização */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-base text-white tracking-wide">
              Atendimento em Santa Maria
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-wood-200/80">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-wood-400 shrink-0 mt-0.5" />
                <span>Atendimento em toda Santa Maria/RS e cidades da região central do RS.</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-wood-400 shrink-0" />
                <span>Segunda a Sexta: 08h às 18h | Sábados com agendamento</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-wood-400 shrink-0" />
                <span>(55) 99123-4567 • Atendimento WhatsApp</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-wood-400 shrink-0" />
                <span>contato@duarteplanejados.com.br</span>
              </li>
            </ul>
          </div>

          {/* Diferenciais */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-base text-white tracking-wide">
              Nosso Compromisso
            </h4>
            <p className="text-xs sm:text-sm text-wood-200/80 leading-relaxed">
              Não competimos por menor preço, mas sim pelo acabamento superior, alinhamento
              milimétrico, ferragens resistentes e compromisso absoluto com o prazo acordado.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-wood-400 hover:text-white transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Área Restrita do Dono</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-wood-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-wood-400">
          <p>
            © {new Date().getFullYear()} Duarte Ambientes Planejados. Todos os direitos reservados.
          </p>
          <p className="text-center sm:text-right">Móveis sob medida em MDF • Santa Maria / RS</p>
        </div>
      </div>
    </footer>
  )
}
