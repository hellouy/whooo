
// 使用 WooMai/whois-servers 提供的 WHOIS 服务器列表
const WHOIS_SERVERS = {
  "ac": "whois.nic.ac",
  "academy": "whois.nic.academy",
  "accountant": "whois.nic.accountant",
  "accountants": "whois.nic.accountants",
  "actor": "whois.nic.actor",
  "ae": "whois.aeda.net.ae",
  "aero": "whois.aero",
  "af": "whois.nic.af",
  "africa": "whois.nic.africa",
  "ag": "whois.nic.ag",
  "agency": "whois.nic.agency",
  "ai": "whois.nic.ai",
  "airforce": "whois.nic.airforce",
  "am": "whois.amnic.net",
  "apartments": "whois.nic.apartments",
  "app": "whois.nic.google",
  "ar": "whois.nic.ar",
  "archi": "whois.nic.archi",
  "army": "whois.nic.army",
  "art": "whois.nic.art",
  "as": "whois.nic.as",
  "asia": "whois.nic.asia",
  "associates": "whois.nic.associates",
  "at": "whois.nic.at",
  "attorney": "whois.nic.attorney",
  "au": "whois.auda.org.au",
  "auction": "whois.nic.auction",
  "audio": "whois.nic.audio",
  "auto": "whois.nic.auto",
  "baby": "whois.nic.baby",
  "band": "whois.nic.band",
  "bar": "whois.nic.bar",
  "bargains": "whois.nic.bargains",
  "bayern": "whois.nic.bayern",
  "be": "whois.dnsbelgium.be",
  "beauty": "whois.nic.beauty",
  "beer": "whois.nic.beer",
  "berlin": "whois.nic.berlin",
  "best": "whois.nic.best",
  "bg": "whois.register.bg",
  "bi": "whois1.nic.bi",
  "bid": "whois.nic.bid",
  "bike": "whois.nic.bike",
  "bingo": "whois.nic.bingo",
  "bio": "whois.nic.bio",
  "biz": "whois.nic.biz",
  "black": "whois.nic.black",
  "blackfriday": "whois.nic.blackfriday",
  "blog": "whois.nic.blog",
  "blue": "whois.nic.blue",
  "boats": "whois.nic.boats",
  "boston": "whois.nic.boston",
  "boutique": "whois.nic.boutique",
  "builders": "whois.nic.builders",
  "business": "whois.nic.business",
  "buzz": "whois.nic.buzz",
  "bw": "whois.nic.net.bw",
  "by": "whois.cctld.by",
  "ca": "whois.cira.ca",
  "cab": "whois.nic.cab",
  "cafe": "whois.nic.cafe",
  "camera": "whois.nic.camera",
  "camp": "whois.nic.camp",
  "capital": "whois.nic.capital",
  "car": "whois.nic.car",
  "cards": "whois.nic.cards",
  "care": "whois.nic.care",
  "career": "whois.nic.career",
  "careers": "whois.nic.careers",
  "cars": "whois.nic.cars",
  "casa": "whois.nic.casa",
  "cash": "whois.nic.cash",
  "casino": "whois.nic.casino",
  "cat": "whois.nic.cat",
  "catering": "whois.nic.catering",
  "cc": "ccwhois.verisign-grs.com",
  "center": "whois.nic.center",
  "ceo": "whois.nic.ceo",
  "cf": "whois.dot.cf",
  "ch": "whois.nic.ch",
  "charity": "whois.nic.charity",
  "chat": "whois.nic.chat",
  "cheap": "whois.nic.cheap",
  "christmas": "whois.nic.christmas",
  "church": "whois.nic.church",
  "city": "whois.nic.city",
  "cl": "whois.nic.cl",
  "claims": "whois.nic.claims",
  "cleaning": "whois.nic.cleaning",
  "click": "whois.nic.click",
  "clinic": "whois.nic.clinic",
  "clothing": "whois.nic.clothing",
  "cloud": "whois.nic.cloud",
  "club": "whois.nic.club",
  "cm": "whois.netcom.cm",
  "cn": "whois.cnnic.cn",
  "co": "whois.nic.co",
  "co.jp": "whois.jprs.jp",
  "co.nz": "whois.nic.nz",
  "co.uk": "whois.nic.uk",
  "co.za": "whois.registry.net.za",
  "coach": "whois.nic.coach",
  "codes": "whois.nic.codes",
  "coffee": "whois.nic.coffee",
  "college": "whois.nic.college",
  "cologne": "whois.nic.cologne",
  "com": "whois.verisign-grs.com",
  "com.au": "whois.auda.org.au",
  "com.tr": "whois.nic.tr",
  "com.tw": "whois.twnic.net.tw",
  "community": "whois.nic.community",
  "company": "whois.nic.company",
  "computer": "whois.nic.computer",
  "condos": "whois.nic.condos",
  "construction": "whois.nic.construction",
  "consulting": "whois.nic.consulting",
  "contact": "whois.nic.contact",
  "contractors": "whois.nic.contractors",
  "cooking": "whois.nic.cooking",
  "cool": "whois.nic.cool",
  "country": "whois.nic.country",
  "coupons": "whois.nic.coupons",
  "courses": "whois.nic.courses",
  "credit": "whois.nic.credit",
  "creditcard": "whois.nic.creditcard",
  "cricket": "whois.nic.cricket",
  "cruises": "whois.nic.cruises",
  "cx": "whois.nic.cx",
  "cz": "whois.nic.cz",
  "dance": "whois.nic.dance",
  "date": "whois.nic.date",
  "dating": "whois.nic.dating",
  "de": "whois.denic.de",
  "deals": "whois.nic.deals",
  "degree": "whois.nic.degree",
  "delivery": "whois.nic.delivery",
  "democrat": "whois.nic.democrat",
  "dental": "whois.nic.dental",
  "dentist": "whois.nic.dentist",
  "desi": "whois.nic.desi",
  "design": "whois.nic.design",
  "dev": "whois.nic.google",
  "diamonds": "whois.nic.diamonds",
  "diet": "whois.nic.diet",
  "digital": "whois.nic.digital",
  "direct": "whois.nic.direct",
  "directory": "whois.nic.directory",
  "discount": "whois.nic.discount",
  "dk": "whois.dk-hostmaster.dk",
  "doctor": "whois.nic.doctor",
  "dog": "whois.nic.dog",
  "domains": "whois.nic.domains",
  "download": "whois.nic.download",
  "dupont": "whois.nic.dupont",
  "earth": "whois.nic.earth",
  "ec": "whois.nic.ec",
  "education": "whois.nic.education",
  "email": "whois.nic.email",
  "energy": "whois.nic.energy",
  "engineer": "whois.nic.engineer",
  "engineering": "whois.nic.engineering",
  "enterprises": "whois.nic.enterprises",
  "equipment": "whois.nic.equipment",
  "es": "whois.nic.es",
  "estate": "whois.nic.estate",
  "eu": "whois.eu",
  "events": "whois.nic.events",
  "exchange": "whois.nic.exchange",
  "expert": "whois.nic.expert",
  "exposed": "whois.nic.exposed",
  "express": "whois.nic.express",
  "fail": "whois.nic.fail",
  "faith": "whois.nic.faith",
  "family": "whois.nic.family",
  "fan": "whois.nic.fan",
  "fans": "whois.nic.fans",
  "farm": "whois.nic.farm",
  "fashion": "whois.nic.fashion",
  "feedack": "whois.nic.feedback",
  "fi": "whois.fi",
  "film": "whois.nic.film",
  "finance": "whois.nic.finance",
  "financial": "whois.nic.financial",
  "fish": "whois.nic.fish",
  "fishing": "whois.nic.fishing",
  "fit": "whois.nic.fit",
  "fitness": "whois.nic.fitness",
  "flights": "whois.nic.flights",
  "florist": "whois.nic.florist",
  "flowers": "whois.nic.flowers",
  "fm": "whois.nic.fm",
  "fo": "whois.nic.fo",
  "football": "whois.nic.football",
  "forsale": "whois.nic.forsale",
  "foundation": "whois.nic.foundation",
  "fr": "whois.nic.fr",
  "fun": "whois.nic.fun",
  "fund": "whois.nic.fund",
  "furniture": "whois.nic.furniture",
  "futbol": "whois.nic.futbol",
  "fyi": "whois.nic.fyi",
  "ga": "whois.dot.ga",
  "gallery": "whois.nic.gallery",
  "game": "whois.nic.game",
  "games": "whois.nic.games",
  "garden": "whois.nic.garden",
  "gd": "whois.nic.gd",
  "gdn": "whois.nic.gdn",
  "ge": "whois.nic.ge",
  "gifts": "whois.nic.gifts",
  "gives": "whois.nic.gives",
  "gl": "whois.nic.gl",
  "glass": "whois.nic.glass",
  "global": "whois.nic.global",
  "gmbh": "whois.nic.gmbh",
  "gold": "whois.nic.gold",
  "golf": "whois.nic.golf",
  "graphics": "whois.nic.graphics",
  "gratis": "whois.nic.gratis",
  "green": "whois.nic.green",
  "gripe": "whois.nic.gripe",
  "group": "whois.nic.group",
  "gs": "whois.nic.gs",
  "guide": "whois.nic.guide",
  "guitars": "whois.nic.guitars",
  "guru": "whois.nic.guru",
  "gy": "whois.registry.gy",
  "hamburg": "whois.nic.hamburg",
  "haus": "whois.nic.haus",
  "healthcare": "whois.nic.healthcare",
  "help": "whois.nic.help",
  "hiphop": "whois.nic.hiphop",
  "hiv": "whois.nic.hiv",
  "hk": "whois.hkirc.hk",
  "hn": "whois.nic.hn",
  "hockey": "whois.nic.hockey",
  "holdings": "whois.nic.holdings",
  "holiday": "whois.nic.holiday",
  "homes": "whois.nic.homes",
  "horse": "whois.nic.horse",
  "hospital": "whois.nic.hospital",
  "host": "whois.nic.host",
  "hosting": "whois.nic.hosting",
  "house": "whois.nic.house",
  "how": "whois.nic.how",
  "hr": "whois.dns.hr",
  "ht": "whois.nic.ht",
  "id": "whois.id",
  "im": "whois.nic.im",
  "immo": "whois.nic.immo",
  "immobilien": "whois.nic.immobilien",
  "in": "whois.registry.in",
  "industries": "whois.nic.industries",
  "info": "whois.nic.info",
  "ink": "whois.nic.ink",
  "institute": "whois.nic.institute",
  "insure": "whois.nic.insure",
  "international": "whois.nic.international",
  "investments": "whois.nic.investments",
  "io": "whois.nic.io",
  "ir": "whois.nic.ir",
  "is": "whois.isnic.is",
  "it": "whois.nic.it",
  "je": "whois.je",
  "jetzt": "whois.nic.jetzt",
  "jewelry": "whois.nic.jewelry",
  "jp": "whois.jprs.jp",
  "juegos": "whois.nic.juegos",
  "kaufen": "whois.nic.kaufen",
  "ki": "whois.nic.ki",
  "kim": "whois.nic.kim",
  "kitchen": "whois.nic.kitchen",
  "kiwi": "whois.nic.kiwi",
  "koeln": "whois.nic.koeln",
  "kr": "whois.kr",
  "krd": "whois.nic.krd",
  "kyoto": "whois.nic.kyoto",
  "la": "whois.nic.la",
  "land": "whois.nic.land",
  "lat": "whois.nic.lat",
  "law": "whois.nic.law",
  "lawyer": "whois.nic.lawyer",
  "lc": "whois.nic.lc",
  "lease": "whois.nic.lease",
  "lgbt": "whois.nic.lgbt",
  "li": "whois.nic.li",
  "life": "whois.nic.life",
  "lighting": "whois.nic.lighting",
  "limited": "whois.nic.limited",
  "limo": "whois.nic.limo",
  "link": "whois.nic.link",
  "live": "whois.nic.live",
  "llc": "whois.nic.llc",
  "loan": "whois.nic.loan",
  "loans": "whois.nic.loans",
  "lol": "whois.nic.lol",
  "london": "whois.nic.london",
  "love": "whois.nic.love",
  "lt": "whois.domreg.lt",
  "ltd": "whois.nic.ltd",
  "lu": "whois.dns.lu",
  "luxury": "whois.nic.luxury",
  "lv": "whois.nic.lv",
  "ly": "whois.nic.ly",
  "ma": "whois.registre.ma",
  "maison": "whois.nic.maison",
  "management": "whois.nic.management",
  "market": "whois.nic.market",
  "marketing": "whois.nic.marketing",
  "markets": "whois.nic.markets",
  "mba": "whois.nic.mba",
  "md": "whois.nic.md",
  "me": "whois.nic.me",
  "media": "whois.nic.media",
  "melbourne": "whois.nic.melbourne",
  "memorial": "whois.nic.memorial",
  "men": "whois.nic.men",
  "menu": "whois.nic.menu",
  "mg": "whois.nic.mg",
  "miami": "whois.nic.miami",
  "mn": "whois.nic.mn",
  "mobi": "whois.nic.mobi",
  "moda": "whois.nic.moda",
  "moe": "whois.nic.moe",
  "mom": "whois.nic.mom",
  "money": "whois.nic.money",
  "monster": "whois.nic.monster",
  "mortgage": "whois.nic.mortgage",
  "moscow": "whois.nic.moscow",
  "motorcycles": "whois.nic.motorcycles",
  "movie": "whois.nic.movie",
  "ms": "whois.nic.ms",
  "mu": "whois.nic.mu",
  "museum": "whois.nic.museum",
  "mx": "whois.mx",
  "my": "whois.mynic.my",
  "na": "whois.na-nic.com.na",
  "nagoya": "whois.nic.nagoya",
  "name": "whois.nic.name",
  "navy": "whois.nic.navy",
  "nc": "whois.nc",
  "network": "whois.nic.network",
  "news": "whois.nic.news",
  "nf": "whois.nic.nf",
  "ng": "whois.nic.net.ng",
  "ninja": "whois.nic.ninja",
  "nl": "whois.domain-registry.nl",
  "no": "whois.norid.no",
  "nrw": "whois.nic.nrw",
  "nu": "whois.iis.nu",
  "nyc": "whois.nic.nyc",
  "nz": "whois.nic.nz",
  "okinawa": "whois.nic.okinawa",
  "om": "whois.registry.om",
  "one": "whois.nic.one",
  "ong": "whois.nic.ong",
  "onl": "whois.nic.onl",
  "online": "whois.nic.online",
  "ooo": "whois.nic.ooo",
  "org": "whois.pir.org",
  "organic": "whois.nic.organic",
  "osaka": "whois.nic.osaka",
  "page": "whois.nic.page",
  "paris": "whois.nic.paris",
  "partners": "whois.nic.partners",
  "parts": "whois.nic.parts",
  "party": "whois.nic.party",
  "pe": "kero.yachay.pe",
  "pet": "whois.nic.pet",
  "ph": "whois.dot.ph",
  "photo": "whois.nic.photo",
  "photography": "whois.nic.photography",
  "photos": "whois.nic.photos",
  "physio": "whois.nic.physio",
  "pics": "whois.nic.pics",
  "pictures": "whois.nic.pictures",
  "pink": "whois.nic.pink",
  "pizza": "whois.nic.pizza",
  "pl": "whois.dns.pl",
  "place": "whois.nic.place",
  "plumbing": "whois.nic.plumbing",
  "plus": "whois.nic.plus",
  "pm": "whois.nic.pm",
  "poker": "whois.nic.poker",
  "porn": "whois.nic.porn",
  "pr": "whois.nic.pr",
  "press": "whois.nic.press",
  "pro": "whois.nic.pro",
  "productions": "whois.nic.productions",
  "promo": "whois.nic.promo",
  "properties": "whois.nic.properties",
  "property": "whois.nic.property",
  "pt": "whois.dns.pt",
  "pub": "whois.nic.pub",
  "pw": "whois.nic.pw",
  "qa": "whois.registry.qa",
  "qpon": "whois.nic.qpon",
  "quebec": "whois.nic.quebec",
  "racing": "whois.nic.racing",
  "re": "whois.nic.re",
  "realestate": "whois.nic.realestate",
  "realty": "whois.nic.realty",
  "recipes": "whois.nic.recipes",
  "red": "whois.nic.red",
  "rehab": "whois.nic.rehab",
  "reise": "whois.nic.reise",
  "reisen": "whois.nic.reisen",
  "rent": "whois.nic.rent",
  "rentals": "whois.nic.rentals",
  "repair": "whois.nic.repair",
  "report": "whois.nic.report",
  "republican": "whois.nic.republican",
  "rest": "whois.nic.rest",
  "restaurant": "whois.nic.restaurant",
  "review": "whois.nic.review",
  "reviews": "whois.nic.reviews",
  "rich": "whois.nic.rich",
  "rio": "whois.nic.rio",
  "ro": "whois.rotld.ro",
  "rocks": "whois.nic.rocks",
  "rodeo": "whois.nic.rodeo",
  "rs": "whois.rnids.rs",
  "ru": "whois.tcinet.ru",
  "rugby": "whois.nic.rugby",
  "run": "whois.nic.run",
  "ryukyu": "whois.nic.ryukyu",
  "sa": "whois.nic.net.sa",
  "saarland": "whois.nic.saarland",
  "sale": "whois.nic.sale",
  "salon": "whois.nic.salon",
  "sarl": "whois.nic.sarl",
  "sc": "whois.nic.sc",
  "school": "whois.nic.school",
  "schule": "whois.nic.schule",
  "science": "whois.nic.science",
  "scot": "whois.nic.scot",
  "se": "whois.iis.se",
  "security": "whois.nic.security",
  "services": "whois.nic.services",
  "sex": "whois.nic.sex",
  "sexy": "whois.nic.sexy",
  "sg": "whois.sgnic.sg",
  "sh": "whois.nic.sh",
  "shiksha": "whois.nic.shiksha",
  "shoes": "whois.nic.shoes",
  "shop": "whois.nic.shop",
  "shopping": "whois.nic.shopping",
  "show": "whois.nic.show",
  "si": "whois.register.si",
  "singles": "whois.nic.singles",
  "site": "whois.nic.site",
  "ski": "whois.nic.ski",
  "sk": "whois.sk-nic.sk",
  "soccer": "whois.nic.soccer",
  "social": "whois.nic.social",
  "software": "whois.nic.software",
  "solar": "whois.nic.solar",
  "solutions": "whois.nic.solutions",
  "soy": "whois.nic.soy",
  "space": "whois.nic.space",
  "sport": "whois.nic.sport",
  "store": "whois.nic.store",
  "stream": "whois.nic.stream",
  "studio": "whois.nic.studio",
  "study": "whois.nic.study",
  "style": "whois.nic.style",
  "supplies": "whois.nic.supplies",
  "supply": "whois.nic.supply",
  "support": "whois.nic.support",
  "surf": "whois.nic.surf",
  "surgery": "whois.nic.surgery",
  "sx": "whois.sx",
  "sydney": "whois.nic.sydney",
  "systems": "whois.nic.systems",
  "taipei": "whois.nic.taipei",
  "tattoo": "whois.nic.tattoo",
  "tax": "whois.nic.tax",
  "taxi": "whois.nic.taxi",
  "tc": "whois.nic.tc",
  "team": "whois.nic.team",
  "tech": "whois.nic.tech",
  "technology": "whois.nic.technology",
  "tel": "whois.nic.tel",
  "tennis": "whois.nic.tennis",
  "tf": "whois.nic.tf",
  "theater": "whois.nic.theater",
  "theatre": "whois.nic.theatre",
  "tickets": "whois.nic.tickets",
  "tienda": "whois.nic.tienda",
  "tips": "whois.nic.tips",
  "tires": "whois.nic.tires",
  "tirol": "whois.nic.tirol",
  "tk": "whois.dot.tk",
  "tl": "whois.nic.tl",
  "to": "whois.tonic.to",
  "today": "whois.nic.today",
  "tokyo": "whois.nic.tokyo",
  "tools": "whois.nic.tools",
  "top": "whois.nic.top",
  "tours": "whois.nic.tours",
  "town": "whois.nic.town",
  "toys": "whois.nic.toys",
  "trade": "whois.nic.trade",
  "trading": "whois.nic.trading",
  "training": "whois.nic.training",
  "tube": "whois.nic.tube",
  "tv": "tvwhois.verisign-grs.com",
  "tw": "whois.twnic.net.tw",
  "uk": "whois.nic.uk",
  "university": "whois.nic.university",
  "uno": "whois.nic.uno",
  "us": "whois.nic.us",
  "vacations": "whois.nic.vacations",
  "vc": "whois.nic.vc",
  "ve": "whois.nic.ve",
  "vegas": "whois.nic.vegas",
  "ventures": "whois.nic.ventures",
  "vg": "whois.nic.vg",
  "viajes": "whois.nic.viajes",
  "video": "whois.nic.video",
  "villas": "whois.nic.villas",
  "vin": "whois.nic.vin",
  "vip": "whois.nic.vip",
  "vision": "whois.nic.vision",
  "vlaanderen": "whois.nic.vlaanderen",
  "vodka": "whois.nic.vodka",
  "vote": "whois.nic.vote",
  "voting": "whois.nic.voting",
  "voto": "whois.nic.voto",
  "voyage": "whois.nic.voyage",
  "wales": "whois.nic.wales",
  "wang": "whois.nic.wang",
  "watch": "whois.nic.watch",
  "webcam": "whois.nic.webcam",
  "website": "whois.nic.website",
  "wedding": "whois.nic.wedding",
  "wf": "whois.nic.wf",
  "wien": "whois.nic.wien",
  "wiki": "whois.nic.wiki",
  "win": "whois.nic.win",
  "wine": "whois.nic.wine",
  "work": "whois.nic.work",
  "works": "whois.nic.works",
  "world": "whois.nic.world",
  "ws": "whois.website.ws",
  "wtf": "whois.nic.wtf",
  "xn--3bst00m": "whois.nic.xn--3bst00m",
  "xn--3ds443g": "whois.nic.xn--3ds443g",
  "xn--55qx5d": "whois.nic.xn--55qx5d",
  "xn--6qq986b3xl": "whois.nic.xn--6qq986b3xl",
  "xn--80adxhks": "whois.nic.xn--80adxhks",
  "xn--80asehdb": "whois.nic.xn--80asehdb",
  "xn--80aswg": "whois.nic.xn--80aswg",
  "xn--c1avg": "whois.nic.xn--c1avg",
  "xn--cg4bki": "whois.nic.xn--cg4bki",
  "xn--czrs0t": "whois.nic.xn--czrs0t",
  "xn--czru2d": "whois.nic.xn--czru2d",
  "xn--d1acj3b": "whois.nic.xn--d1acj3b",
  "xn--fiq228c5hs": "whois.nic.xn--fiq228c5hs",
  "xn--fiq64b": "whois.nic.xn--fiq64b",
  "xn--i1b6b1a6a2e": "whois.nic.xn--i1b6b1a6a2e",
  "xn--io0a7i": "whois.nic.xn--io0a7i",
  "xn--j1amh": "whois.dotukr.com",
  "xn--kput3i": "whois.nic.xn--kput3i",
  "xn--mgbab2bd": "whois.nic.xn--mgbab2bd",
  "xn--ngbc5azd": "whois.nic.xn--ngbc5azd",
  "xn--nqv7f": "whois.nic.xn--nqv7f",
  "xn--nqv7fs00ema": "whois.nic.xn--nqv7fs00ema",
  "xn--q9jyb4c": "whois.nic.xn--q9jyb4c",
  "xn--rhqv96g": "whois.nic.xn--rhqv96g",
  "xn--ses554g": "whois.nic.xn--ses554g",
  "xn--unup4y": "whois.nic.xn--unup4y",
  "xn--vhquv": "whois.nic.xn--vhquv",
  "xn--zfr164b": "whois.nic.xn--zfr164b",
  "xxx": "whois.nic.xxx",
  "xyz": "whois.nic.xyz",
  "yachts": "whois.nic.yachts",
  "yoga": "whois.nic.yoga",
  "yokohama": "whois.nic.yokohama",
  "yt": "whois.nic.yt",
  "za.com": "whois.centralnic.com",
  "zone": "whois.nic.zone",
  "zuerich": "whois.nic.zuerich"
};

// 默认 WHOIS 服务器，用于未知的顶级域名
const DEFAULT_WHOIS_SERVER = 'whois.iana.org';

// 从域名中提取顶级域名
function extractTLD(domain) {
  // 处理复合顶级域名，如 co.uk
  const commonSecondLevelDomains = ['co.uk', 'co.jp', 'co.nz', 'co.za', 'com.au', 'com.tr', 'com.tw', 'za.com'];
  
  for (const sld of commonSecondLevelDomains) {
    if (domain.endsWith('.' + sld)) {
      return sld;
    }
  }
  
  // 处理普通顶级域名
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts[parts.length - 1].toLowerCase();
  }
  
  return '';
}

// 获取域名对应的 WHOIS 服务器
function getWhoisServer(domain) {
  // 首先尝试匹配完整域名的TLD(如 co.uk)
  for (const [tld, server] of Object.entries(WHOIS_SERVERS)) {
    if (domain.endsWith('.' + tld)) {
      return server;
    }
  }
  
  // 如果没有匹配到复合顶级域名，尝试匹配简单顶级域名
  const simpleTLD = extractTLD(domain);
  if (simpleTLD && WHOIS_SERVERS[simpleTLD]) {
    return WHOIS_SERVERS[simpleTLD];
  }
  
  // 如果无法确定 WHOIS 服务器，使用默认服务器
  return DEFAULT_WHOIS_SERVER;
}

// 解析 WHOIS 原始数据
function parseWhoisData(rawData) {
  const result = {
    rawData: rawData,
    registrar: extractValue(rawData, ['Registrar:', 'Sponsoring Registrar:', 'Registrant Name:']),
    creationDate: extractValue(rawData, ['Creation Date:', 'Created On:', 'Registration Date:', 'Domain Create Date:', 'Domain Registration Date:']),
    expiryDate: extractValue(rawData, ['Registry Expiry Date:', 'Expiration Date:', 'Expiry Date:', 'Domain Expiration Date:']),
    status: extractValue(rawData, ['Status:', 'Domain Status:']),
    nameServers: extractNameServers(rawData),
    whoisServer: extractValue(rawData, ['Registrar WHOIS Server:', 'WHOIS Server:']),
    registrant: extractValue(rawData, ['Registrant:', 'Registrant Organization:', 'Registrant Name:', 'Registrant Contact:'])
  };
  
  return result;
}

// 从 WHOIS 数据中提取特定字段的值
function extractValue(data, possibleKeys) {
  const lines = data.split('\n');
  for (const line of lines) {
    for (const key of possibleKeys) {
      if (line.includes(key)) {
        const value = line.split(key)[1]?.trim();
        if (value) return value;
      }
    }
  }
  return '未知';
}

// 提取名称服务器
function extractNameServers(data) {
  const lines = data.split('\n');
  const nameServers = [];
  
  for (const line of lines) {
    // 匹配常见的名称服务器表示方式
    if (line.includes('Name Server:') || 
        line.includes('nameserver:') || 
        line.includes('nserver:') ||
        line.match(/ns[0-9]+\./i) || 
        line.match(/dns[0-9]+\./i)) {
      
      const parts = line.split(':');
      if (parts.length > 1) {
        const server = parts[1].trim().toLowerCase();
        if (server && 
            server.includes('.') && 
            !nameServers.includes(server) &&
            !server.includes('clientdeleteprohibited') &&
            !server.includes('clienttransferprohibited') &&
            !server.includes('clientupdateprohibited')) {
          nameServers.push(server);
        }
      }
    }
  }
  
  return nameServers;
}

// 使用第三方 API 获取 WHOIS 信息
async function getWhoisInfo(domain) {
  try {
    // 确定 WHOIS 服务器
    const whoisServer = getWhoisServer(domain);
    console.log(`Using WHOIS server: ${whoisServer} for domain: ${domain}`);
    
    // 由于 Vercel 是无服务器环境，我们不能直接进行 TCP 连接
    // 使用第三方 API 服务
    const apiKey = process.env.WHOIS_API_KEY;
    if (!apiKey) {
      throw new Error('未配置 WHOIS API 密钥');
    }
    
    // 使用 whoisjsonapi.com API
    const response = await fetch(`https://whoisjsonapi.com/v1/${domain}?apiKey=${apiKey}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${response.status} - ${errorText}`);
      throw new Error(`WHOIS API 错误: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    // 处理 API 响应
    if (data.errors) {
      throw new Error(data.errors[0]?.detail || '查询失败');
    }
    
    // 解析 WHOIS 数据
    const whoisData = data.whois_record || {};
    const rawText = whoisData.raw_text || data.raw_text || "无法获取原始 WHOIS 数据";
    
    // 对原始数据进行解析
    const parsedData = parseWhoisData(rawText);
    
    // 合并 API 返回的数据和解析的数据
    return {
      domain: domain,
      whoisServer: whoisServer,
      registrar: whoisData.registrar || parsedData.registrar,
      creationDate: whoisData.created_date || parsedData.creationDate,
      expiryDate: whoisData.expiration_date || parsedData.expiryDate,
      nameServers: whoisData.name_servers || parsedData.nameServers,
      status: whoisData.status || parsedData.status,
      registrant: whoisData.registrant || parsedData.registrant,
      rawData: rawText
    };
  } catch (error) {
    console.error('WHOIS lookup error:', error);
    return { error: error.message || '无法获取域名信息，请稍后重试' };
  }
}

// Vercel API 路由处理函数
export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 仅处理 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }
  
  // 获取请求中的域名
  const { domain } = req.body;
  
  if (!domain) {
    return res.status(400).json({ error: '请提供域名' });
  }
  
  try {
    // 获取 WHOIS 信息
    const whoisInfo = await getWhoisInfo(domain);
    
    // 返回结果
    res.status(200).json(whoisInfo);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: '服务器内部错误: ' + error.message });
  }
}
