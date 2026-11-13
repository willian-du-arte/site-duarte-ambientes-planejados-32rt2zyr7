export interface ServiceItem {
  id: string
  title: string
  category: 'residencial' | 'corporativo' | 'especial'
  description: string
  highlight: string
  iconName: string
  image: string
}

export const SERVICES: ServiceItem[] = [
  {
    id: 'cozinhas',
    title: 'Cozinhas Planejadas',
    category: 'residencial',
    description:
      'Aproveitamento milimétrico de espaço, gavetões reforçados, torres quentes, ilhas funcionais e bancadas ergonômicas.',
    highlight: 'Ferragens amortecidas e MDF resistente à umidade',
    iconName: 'UtensilsCrossed',
    image: 'https://img.usecurling.com/p/800/600?q=modern%20kitchen%20cabinets&color=orange',
  },
  {
    id: 'dormitorios',
    title: 'Dormitórios & Quartos',
    category: 'residencial',
    description:
      'Cabeceiras estofadas ou ripadas, mesas de apoio suspensas e organização sob medida para noites de descanso com elegância.',
    highlight: 'Iluminação em LED integrada e nichos inteligentes',
    iconName: 'BedDouble',
    image: 'https://img.usecurling.com/p/800/600?q=luxury%20bedroom%20wardrobe&color=orange',
  },
  {
    id: 'closets',
    title: 'Closets Personalizados',
    category: 'residencial',
    description:
      'Divisões pensadas para a sua rotina: calceiros, sapateiras com corrediças invisíveis, gavetas para acessórios e portas espelhadas.',
    highlight: 'Organização prática e acabamentos nobres',
    iconName: 'Shirt',
    image: 'https://img.usecurling.com/p/800/600?q=walk%20in%20closet&color=orange',
  },
  {
    id: 'paineis-tv',
    title: 'Painéis de TV & Home Theater',
    category: 'residencial',
    description:
      'Painéis ripados, nichos para equipamentos, passagem oculta de fiação e racks suspensos que valorizam a sua sala de estar.',
    highlight: 'Fiação 100% invisível e design marcante',
    iconName: 'Tv',
    image: 'https://img.usecurling.com/p/800/600?q=living%20room%20tv%20panel&color=orange',
  },
  {
    id: 'banheiros',
    title: 'Banheiros & Lavabos',
    category: 'residencial',
    description:
      'Gabinetes suspensos, espelheiras com nicho oculto e armários adaptados a áreas úmidas com proteção e durabilidade.',
    highlight: 'MDF ultra-resistente e puxadores anticorrosão',
    iconName: 'Sparkles',
    image: 'https://img.usecurling.com/p/800/600?q=modern%20bathroom%20vanity&color=orange',
  },
  {
    id: 'escritorios',
    title: 'Home Office & Escritórios',
    category: 'corporativo',
    description:
      'Mesas amplas, gaveteiros com chave, estantes para livros e organização ergonômica para máxima produtividade com conforto.',
    highlight: 'Passa-cabos embutidos e ergonomia certificada',
    iconName: 'Briefcase',
    image: 'https://img.usecurling.com/p/800/600?q=home%20office%20desk%20shelves&color=orange',
  },
  {
    id: 'clinicas',
    title: 'Clínicas & Consultórios',
    category: 'corporativo',
    description:
      'Móveis higienizáveis, bancadas hospitalares e consultórios planejados de acordo com normas sanitárias e acolhimento dos pacientes.',
    highlight: 'Atendimento às normas sanitárias e acabamento impecável',
    iconName: 'Stethoscope',
    image: 'https://img.usecurling.com/p/800/600?q=medical%20clinic%20office&color=orange',
  },
  {
    id: 'corporativo',
    title: 'Mobiliário Corporativo & Comercial',
    category: 'corporativo',
    description:
      'Balcões de recepção imponentes, salas de reunião, mesas de diretoria e espaços comerciais para marcas que prezam por distinção.',
    highlight: 'Projetos sob medida para empresas e instituições',
    iconName: 'Building2',
    image: 'https://img.usecurling.com/p/800/600?q=modern%20office%20reception&color=orange',
  },
  {
    id: 'modelagem-3d',
    title: 'Projetos Personalizados com Modelagem 3D',
    category: 'especial',
    description:
      'Visualize cada detalhe, textura, iluminação e dimensão antes do início da fabricação. Ajustamos até ficar exatamente como sonhou.',
    highlight: 'Visualização realista antes de produzir',
    iconName: 'Layers',
    image:
      'https://img.usecurling.com/p/800/600?q=architectural%203d%20interior%20render&color=orange',
  },
]

export interface TestimonialItem {
  id: string
  name: string
  role: string
  location: string
  environment: string
  text: string
  rating: number
}

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: '1',
    name: 'Mariana & Lucas Silveira',
    role: 'Proprietários residenciais',
    location: 'Centro — Santa Maria/RS',
    environment: 'Cozinha e Área Gourmet',
    text: 'A experiência com a Duarte foi impecável do projeto à montagem. O acabamento dos armários da cozinha e a ilha central superaram nossas expectativas. Não abriram mão da qualidade em nenhum detalhe.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Dr. Roberto Vargas',
    role: 'Diretor Clínico',
    location: 'Nossa Senhora de Lourdes — Santa Maria/RS',
    environment: 'Recepção e Consultórios Médicos',
    text: 'A precisão milimétrica e o padrão do MDF transformaram nossa clínica. Nossos pacientes elogiam o acolhimento do ambiente e a equipe cumpriu o cronograma com extrema pontualidade.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Carolina Dambros',
    role: 'Arquiteta parceira',
    location: 'Camobi — Santa Maria/RS',
    environment: 'Dormitório de Casal e Closet',
    text: 'Como arquiteta, o que mais valorizo na marcenaria da Duarte é a fidelidade aos projetos 3D. Eles compreendem encaixes complexos, materiais nobres e entregam um resultado refinado.',
    rating: 5,
  },
]

export const HIGHLIGHT_NUMBERS = [
  {
    value: '+450',
    label: 'Projetos Entregues',
    detail: 'Em Santa Maria e região central',
  },
  {
    value: '14',
    label: 'Anos de Experiência',
    detail: 'Tradição em marcenaria sob medida',
  },
  {
    value: '100%',
    label: 'MDF de Alto Padrão',
    detail: 'Ferragens nobres e amortecimento',
  },
  {
    value: '3D',
    label: 'Modelagem Realista',
    detail: 'Visualização completa antes de fabricar',
  },
]

export const STEPS_PROCESS = [
  {
    step: '01',
    title: 'Atendimento Inicial',
    desc: 'Conversamos sobre suas necessidades, gostos, estilo de vida e o ambiente a ser transformado.',
  },
  {
    step: '02',
    title: 'Levantamento de Medidas',
    desc: 'Visita técnica ao seu imóvel para medição milimétrica de todas as paredes, pontos de luz e encanamento.',
  },
  {
    step: '03',
    title: 'Projeto 3D & Orçamento',
    desc: 'Apresentação visual realista com escolha de acabamentos em MDF, ferragens e proposta detalhada.',
  },
  {
    step: '04',
    title: 'Contratação & Fabricação',
    desc: 'Corte de precisão, fitamento industrial e montagem estrutural em marcenaria especializada.',
  },
  {
    step: '05',
    title: 'Instalação & Entrega',
    desc: 'Equipe própria realiza a instalação limpa, testes de alinhamento e entrega final com garantia.',
  },
]
