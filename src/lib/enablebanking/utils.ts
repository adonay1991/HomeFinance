import type { Transaction } from './types'
import type { CategoryKey } from '@/lib/constants'

// ==========================================
// UTILIDADES DE CATEGORIZACIÓN AUTOMÁTICA
// ==========================================

/**
 * Mapeo de MCC codes (Merchant Category Codes) a categorías de HomeFinance.
 *
 * MCC es un código de 4 dígitos asignado por las redes de tarjetas
 * que indica el tipo de negocio del comercio.
 *
 * Referencias: https://en.wikipedia.org/wiki/Merchant_category_code
 */
const MCC_TO_CATEGORY: Record<string, CategoryKey> = {
  // COMIDA (5411-5499, 5812-5814)
  '5411': 'comida', // Grocery Stores, Supermarkets
  '5412': 'comida', // Convenience Stores
  '5422': 'comida', // Freezer, Locker Meat Provisioners
  '5441': 'comida', // Candy, Nut, Confectionery
  '5451': 'comida', // Dairy Products
  '5462': 'comida', // Bakeries
  '5499': 'comida', // Miscellaneous Food Stores
  '5812': 'comida', // Eating Places and Restaurants
  '5813': 'comida', // Drinking Places (Bars, Taverns)
  '5814': 'comida', // Fast Food Restaurants

  // TRANSPORTE (4011-4789, 5541-5599)
  '4011': 'transporte', // Railroads
  '4111': 'transporte', // Local Passenger Transportation
  '4112': 'transporte', // Passenger Railways
  '4121': 'transporte', // Taxicabs and Limousines
  '4131': 'transporte', // Bus Lines
  '4214': 'transporte', // Motor Freight Carriers
  '4411': 'transporte', // Cruise Lines
  '4457': 'transporte', // Boat Rentals
  '4468': 'transporte', // Marinas
  '4511': 'transporte', // Airlines
  '4722': 'transporte', // Travel Agencies
  '4784': 'transporte', // Bridge and Road Tolls
  '4789': 'transporte', // Transportation Services
  '5511': 'transporte', // Automobile and Truck Dealers
  '5521': 'transporte', // Used Car Dealers
  '5531': 'transporte', // Auto Parts Stores
  '5532': 'transporte', // Tire Stores
  '5533': 'transporte', // Auto Parts Accessories
  '5541': 'transporte', // Service Stations (Gasoline)
  '5542': 'transporte', // Automated Fuel Dispensers
  '5571': 'transporte', // Motorcycle Dealers
  '5592': 'transporte', // Motor Homes Dealers
  '5598': 'transporte', // Snowmobile Dealers
  '5599': 'transporte', // Miscellaneous Auto Dealers
  '7511': 'transporte', // Truck Stop
  '7512': 'transporte', // Car Rental
  '7513': 'transporte', // Truck Rental
  '7519': 'transporte', // Motor Home Rental
  '7523': 'transporte', // Parking Lots and Garages
  '7531': 'transporte', // Auto Body Repair
  '7534': 'transporte', // Tire Retreading
  '7535': 'transporte', // Auto Paint Shops
  '7538': 'transporte', // Auto Service Shops
  '7542': 'transporte', // Car Washes
  '7549': 'transporte', // Towing Services

  // FACTURAS (4812-4900, 6300)
  '4812': 'facturas', // Telecommunication Equipment
  '4813': 'facturas', // Key-entry Telecom Merchant
  '4814': 'facturas', // Telecommunication Services
  '4816': 'facturas', // Computer Network Services
  '4821': 'facturas', // Telegraph Services
  '4829': 'facturas', // Wire Transfer
  '4899': 'facturas', // Cable, Satellite, Other Pay TV
  '4900': 'facturas', // Utilities: Electric, Gas, Water
  '6300': 'facturas', // Insurance Sales

  // HOGAR (5039-5251, 5712-5722)
  '5039': 'hogar', // Construction Materials
  '5046': 'hogar', // Commercial Equipment
  '5051': 'hogar', // Metal Service Centers
  '5065': 'hogar', // Electrical Parts
  '5072': 'hogar', // Hardware Equipment
  '5074': 'hogar', // Plumbing Equipment
  '5085': 'hogar', // Industrial Supplies
  '5198': 'hogar', // Paint and Wallpaper
  '5200': 'hogar', // Home Supply Warehouse
  '5211': 'hogar', // Building Materials
  '5231': 'hogar', // Glass, Paint, Wallpaper
  '5251': 'hogar', // Hardware Stores
  '5261': 'hogar', // Lawn and Garden Supply
  '5712': 'hogar', // Furniture, Home Furnishings
  '5713': 'hogar', // Floor Covering Stores
  '5714': 'hogar', // Drapery and Upholstery
  '5718': 'hogar', // Fireplace, Fireplace Screens
  '5719': 'hogar', // Miscellaneous Home Furnishing
  '5722': 'hogar', // Household Appliance Stores
  '7623': 'hogar', // A/C and Refrigeration Repair
  '7629': 'hogar', // Electrical Repair Shops
  '7631': 'hogar', // Watch, Clock, Jewelry Repair
  '7641': 'hogar', // Furniture Repair
  '7692': 'hogar', // Welding Services
  '7699': 'hogar', // Miscellaneous Repair Shops

  // SALUD (5912, 5975-5977, 8011-8099)
  '5912': 'salud', // Drug Stores and Pharmacies
  '5975': 'salud', // Hearing Aids
  '5976': 'salud', // Orthopedic Goods
  '5977': 'salud', // Cosmetic Stores
  '8011': 'salud', // Doctors
  '8021': 'salud', // Dentists, Orthodontists
  '8031': 'salud', // Osteopaths
  '8041': 'salud', // Chiropractors
  '8042': 'salud', // Optometrists, Ophthalmologists
  '8043': 'salud', // Opticians
  '8049': 'salud', // Podiatrists, Chiropodists
  '8050': 'salud', // Nursing/Personal Care
  '8062': 'salud', // Hospitals
  '8071': 'salud', // Medical/Dental Labs
  '8099': 'salud', // Medical Services

  // OCIO (5815-5818, 5941-5973, 7832-7999)
  '5815': 'ocio', // Digital Goods Media
  '5816': 'ocio', // Digital Goods Games
  '5817': 'ocio', // Digital Goods Applications
  '5818': 'ocio', // Digital Goods Multi-Category
  '5941': 'ocio', // Sporting Goods
  '5942': 'ocio', // Book Stores
  '5943': 'ocio', // Stationery Stores
  '5945': 'ocio', // Hobby, Toy, Game Shops
  '5946': 'ocio', // Camera and Photo Supply
  '5947': 'ocio', // Gift, Card, Novelty
  '5948': 'ocio', // Luggage and Leather
  '5970': 'ocio', // Artist Supply Stores
  '5971': 'ocio', // Art Dealers and Galleries
  '5972': 'ocio', // Stamp and Coin Stores
  '5973': 'ocio', // Religious Goods
  '7832': 'ocio', // Motion Picture Theaters
  '7841': 'ocio', // Video Tape Rental
  '7911': 'ocio', // Dance Halls
  '7922': 'ocio', // Theatrical Producers
  '7929': 'ocio', // Bands, Orchestras
  '7932': 'ocio', // Billiard/Pool
  '7933': 'ocio', // Bowling Alleys
  '7941': 'ocio', // Athletic Fields
  '7991': 'ocio', // Tourist Attractions
  '7992': 'ocio', // Golf Courses
  '7993': 'ocio', // Video Amusement
  '7994': 'ocio', // Video Game Arcades
  '7995': 'ocio', // Betting/Casino Gambling
  '7996': 'ocio', // Amusement Parks
  '7997': 'ocio', // Membership Clubs
  '7998': 'ocio', // Aquariums
  '7999': 'ocio', // Recreation Services
}

/**
 * Palabras clave en español para categorización por descripción.
 * Se buscan de forma case-insensitive en el nombre del comercio.
 */
const KEYWORD_TO_CATEGORY: Array<{ keywords: string[]; category: CategoryKey }> = [
  // COMIDA - Supermercados españoles
  {
    keywords: [
      'mercadona', 'carrefour', 'lidl', 'aldi', 'dia', 'eroski',
      'alcampo', 'hipercor', 'el corte ingles alimentacion',
      'consum', 'bonarea', 'condis', 'caprabo', 'coviran',
      'ahorramas', 'gadis', 'mas y mas', 'supersol', 'hiperdino',
      'supermercado', 'fruteria', 'panaderia', 'carniceria',
      'pescaderia', 'charcuteria',
      // Restaurantes y comida rapida
      'mcdonalds', 'mcdonald', 'burger king', 'kfc', 'telepizza',
      'dominos', 'pizza hut', 'foster hollywood', 'vips',
      'goiko', 'lateral', 'rodilla', 'pans', 'granier',
      'starbucks', '100 montaditos', 'la tagliatella',
      'restaurante', 'cafeteria', 'bar', 'cerveceria',
      'just eat', 'glovo', 'uber eats', 'deliveroo',
    ],
    category: 'comida',
  },

  // TRANSPORTE
  {
    keywords: [
      // Gasolineras
      'repsol', 'cepsa', 'bp', 'shell', 'galp', 'petronor',
      'gasolinera', 'gasolina', 'diesel', 'combustible',
      // Transporte publico
      'renfe', 'metro', 'emt', 'tmb', 'tussam', 'metrobus',
      'autobus', 'cercanias', 'ave', 'ouigo', 'iryo',
      'bono transporte', 'tarjeta transporte',
      // Movilidad
      'uber', 'cabify', 'bolt', 'freenow', 'taxi',
      'blablacar', 'lime', 'tier', 'voi', 'bird',
      // Parking y peajes
      'parking', 'aparcamiento', 'empark', 'saba',
      'autopista', 'peaje', 'telepeaje', 'via-t',
      // Aeropuertos y vuelos
      'iberia', 'vueling', 'ryanair', 'air europa', 'volotea',
      'easyjet', 'norwegian', 'aena', 'aeropuerto',
    ],
    category: 'transporte',
  },

  // FACTURAS
  {
    keywords: [
      // Telefonia
      'movistar', 'vodafone', 'orange', 'yoigo', 'masmovil',
      'pepephone', 'lowi', 'o2', 'digi', 'simyo', 'amena',
      // Electricidad y gas
      'endesa', 'iberdrola', 'naturgy', 'repsol luz', 'enel',
      'holaluz', 'factor energia', 'lucera', 'som energia',
      'luz', 'electricidad', 'gas natural',
      // Agua
      'canal isabel', 'aguas', 'aigues', 'emasesa',
      // Internet y TV
      'netflix', 'hbo', 'disney+', 'prime video', 'spotify',
      'dazn', 'apple tv', 'filmin', 'movistar+',
      // Seguros
      'mapfre', 'axa', 'allianz', 'generali', 'sanitas',
      'adeslas', 'dkv', 'asisa', 'caser', 'zurich',
      'seguro', 'poliza',
      // Otros servicios
      'hacienda', 'impuesto', 'ibi', 'tasas',
    ],
    category: 'facturas',
  },

  // HOGAR
  {
    keywords: [
      'ikea', 'leroy merlin', 'bricodepot', 'bauhaus',
      'aki', 'bricor', 'bricomart', 'ferreteria',
      'muebles', 'decoracion', 'colchon', 'colchones',
      'zara home', 'maisons du monde', 'muy mucho',
      'mediamarkt', 'media markt', 'pc componentes',
      'worten', 'fnac', 'apple store',
      'electrodomestico', 'lavadora', 'nevera', 'horno',
      'limpieza', 'fregona', 'detergente',
      // Alquiler / hipoteca (keywords genericos)
      'alquiler piso', 'mensualidad vivienda',
    ],
    category: 'hogar',
  },

  // SALUD
  {
    keywords: [
      // Farmacias
      'farmacia', 'parafarmacia', 'botica',
      // Opticas
      'optica', 'general optica', 'afflelou', 'multiOpticas',
      'specsavers', 'visionlab', 'lentes',
      // Clinicas
      'clinica', 'hospital', 'quironsalud', 'hm hospitales',
      'vithas', 'sanitas', 'dentista', 'dental', 'fisioterapia',
      'podologo', 'psicologo', 'medico', 'consulta',
      // Gimnasios y bienestar
      'gimnasio', 'gym', 'basic fit', 'mcfit', 'altafit',
      'virgin active', 'o2 centro', 'dir', 'go fit',
      'yoga', 'pilates', 'crossfit',
    ],
    category: 'salud',
  },

  // OCIO
  {
    keywords: [
      // Cine y entretenimiento
      'cine', 'cinesa', 'yelmo', 'kinepolis', 'ocine',
      'teatro', 'concierto', 'ticketmaster', 'entradas',
      'escape room', 'bowling', 'bolos', 'karting',
      // Viajes y turismo
      'booking', 'airbnb', 'expedia', 'hotel', 'hostal',
      'trivago', 'edreams', 'viaje', 'vacaciones',
      // Tiendas de ropa y moda
      'zara', 'h&m', 'mango', 'pull&bear', 'bershka',
      'stradivarius', 'massimo dutti', 'primark', 'uniqlo',
      'decathlon', 'sprinter', 'foot locker', 'jd sports',
      // Otros ocio
      'amazon', 'aliexpress', 'shein', 'wish',
      'steam', 'playstation', 'xbox', 'nintendo',
      'fnac', 'casa del libro', 'el corte ingles',
      'parfois', 'bijou brigitte', 'swarovski',
    ],
    category: 'ocio',
  },
]

/**
 * Categoriza una transaccion bancaria automaticamente.
 *
 * Prioridad:
 * 1. MCC code (si disponible)
 * 2. Keywords en descripcion/nombre comercio
 * 3. Default: 'otros'
 *
 * @param transaction Transaccion de Enable Banking
 * @returns Categoria de HomeFinance
 */
export function categorizeTransaction(transaction: Transaction): CategoryKey {
  // 1. Intentar categorizar por MCC code
  if (transaction.merchantCategoryCode) {
    const mccCategory = MCC_TO_CATEGORY[transaction.merchantCategoryCode]
    if (mccCategory) {
      return mccCategory
    }
  }

  // 2. Intentar categorizar por keywords
  const searchText = [
    transaction.creditorName,
    transaction.debtorName,
    transaction.remittanceInformationUnstructured,
    transaction.additionalInformation,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  for (const { keywords, category } of KEYWORD_TO_CATEGORY) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category
      }
    }
  }

  // 3. Default
  return 'otros'
}

/**
 * Extrae una descripcion legible de una transaccion.
 */
export function getTransactionDescription(transaction: Transaction): string {
  // Priorizar nombre del comercio/receptor
  if (transaction.creditorName) {
    return transaction.creditorName
  }

  if (transaction.debtorName) {
    return transaction.debtorName
  }

  // Si no hay nombre, usar la informacion de remesa
  if (transaction.remittanceInformationUnstructured) {
    // Limpiar la descripcion (suele venir con basura)
    return transaction.remittanceInformationUnstructured
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100)
  }

  if (transaction.additionalInformation) {
    return transaction.additionalInformation.slice(0, 100)
  }

  return 'Transaccion bancaria'
}

/**
 * Determina si una transaccion es un gasto (amount negativo).
 * Retorna true si es un gasto, false si es un ingreso.
 */
export function isExpense(transaction: Transaction): boolean {
  const amount = parseFloat(transaction.transactionAmount.amount)
  return amount < 0
}

/**
 * Genera un ID unico para una transaccion.
 * Usa el transactionId si existe, o crea uno basado en los datos.
 */
export function getTransactionExternalId(transaction: Transaction): string {
  if (transaction.transactionId) {
    return transaction.transactionId
  }

  if (transaction.internalTransactionId) {
    return transaction.internalTransactionId
  }

  // Fallback: crear hash de los datos principales
  const data = [
    transaction.bookingDate,
    transaction.transactionAmount.amount,
    transaction.creditorName,
    transaction.debtorName,
  ].join('|')

  // Simple hash (no criptografico, solo para unicidad)
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  return `gen_${Math.abs(hash).toString(16)}`
}

/**
 * Convierte una transaccion de Enable Banking a los datos
 * necesarios para crear un expense en HomeFinance.
 */
export function transactionToExpenseData(
  transaction: Transaction,
  accountId: string
): {
  amount: number
  description: string
  category: CategoryKey
  date: string
  externalId: string
  rawData: unknown
} {
  const amount = Math.abs(parseFloat(transaction.transactionAmount.amount))

  return {
    amount,
    description: getTransactionDescription(transaction),
    category: categorizeTransaction(transaction),
    date: transaction.bookingDate || transaction.valueDate || new Date().toISOString().split('T')[0],
    externalId: getTransactionExternalId(transaction),
    rawData: transaction,
  }
}
