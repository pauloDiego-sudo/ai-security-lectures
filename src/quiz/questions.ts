import type { Question } from './types';

/** Question bank (French). `ans` is the index of the correct option in `opts`. */
export const QUESTIONS: readonly Question[] = [
  // ═══ CHAPITRE 2: FUNDAMENTOS ═══
  {
    ch: 2, topic: "Fundamentos",
    q: "Quelle est la différence fondamentale entre la programmation traditionnelle et le machine learning ?",
    opts: [
      "Le ML utilise plus de mémoire que la programmation traditionnelle",
      "La programmation traditionnelle suit données + programme → sortie, le ML inverse : données + sortie attendue → programme",
      "Le ML ne nécessite pas de données d'entraînement",
      "La programmation traditionnelle ne peut pas traiter des images"
    ],
    ans: 1,
    expl: "En ML, on fournit des données et les sorties attendues, et le modèle apprend le programme (fonction f(x;θ)). C'est l'inversion du paradigme classique."
  },
  {
    ch: 2, topic: "Fundamentos",
    q: "Selon l'hypothèse du manifold, pourquoi les exemples adversariaux sont-ils détectables en théorie ?",
    opts: [
      "Ils ont une taille de fichier différente",
      "Ils se trouvent souvent hors du manifold des données naturelles (x' ∉ M)",
      "Ils contiennent toujours du bruit visible",
      "Ils modifient les poids du modèle"
    ],
    ans: 1,
    expl: "Les données réelles se concentrent sur des manifolds de basse dimension. Un adversarial x' = x + δ quitte souvent ce manifold, permettant en théorie sa détection."
  },
  {
    ch: 2, topic: "Fundamentos",
    q: "Quel composant du pipeline ML est visé par une attaque de type 'data poisoning' ?",
    opts: [
      "Les gradients ∇",
      "La frontière de décision ∂R",
      "Les données d'entraînement S",
      "Les paramètres θ du modèle"
    ],
    ans: 2,
    expl: "Le data poisoning injecte des données malveillantes dans le training set S pour corrompre l'apprentissage du modèle."
  },
  {
    ch: 2, topic: "Fundamentos",
    q: "Quelle attaque permet à un attaquant de déterminer si un individu spécifique faisait partie du dataset d'entraînement ?",
    opts: [
      "Model Stealing",
      "Evasion Attack",
      "Membership Inference",
      "Backdoor Attack"
    ],
    ans: 2,
    expl: "Le membership inference détermine si x était dans le training set. Pour des données médicales, cela révèle qu'une personne a (ou a eu) une condition spécifique."
  },
  {
    ch: 2, topic: "Fundamentos",
    q: "Comment fonctionne une attaque par backdoor ?",
    opts: [
      "L'attaquant modifie les poids du modèle après le déploiement",
      "L'attaquant ajoute un trigger spécifique dans les données d'entraînement ; le modèle fonctionne normalement sauf quand le trigger apparaît",
      "L'attaquant intercepte les communications réseau du modèle",
      "L'attaquant utilise du brute force sur les hyperparamètres"
    ],
    ans: 1,
    expl: "Le modèle fonctionne normalement dans la majorité des cas, mais produit la sortie souhaitée par l'attaquant quand le trigger spécifique apparaît. La détection est extrêmement difficile (Neural Cleanse, Spectral Signatures)."
  },

  // ═══ CHAPITRE 3: EVASION INTRO ═══
  {
    ch: 3, topic: "Evasion — Intro",
    q: "À quel moment du cycle de vie du modèle se produisent les attaques d'évasion ?",
    opts: [
      "Pendant l'entraînement (training time)",
      "Pendant la collecte des données",
      "Pendant l'inférence (inference time), le modèle est déjà entraîné et gelé",
      "Pendant le déploiement du modèle"
    ],
    ans: 2,
    expl: "Une attaque d'évasion se produit en temps d'inférence. Le modèle est déjà entraîné et gelé — l'attaquant ne modifie ni les poids ni les données d'entraînement."
  },
  {
    ch: 3, topic: "Evasion — Intro",
    q: "Pourquoi le bruit aléatoire gaussien ne fonctionne-t-il PAS comme attaque adversariale ?",
    opts: [
      "Parce que le bruit aléatoire est toujours visible",
      "Parce qu'en haute dimension, la probabilité qu'un vecteur aléatoire s'aligne avec la direction nécessaire décroît exponentiellement",
      "Parce que les GPU ne peuvent pas générer de bruit aléatoire",
      "Parce que les réseaux de neurones filtrent automatiquement le bruit"
    ],
    ans: 1,
    expl: "P[succès avec bruit i.i.d.] décroît exponentiellement avec la dimension d. Pour 'forcer' le passage, il faudrait un σ qui croît exponentiellement — détruisant complètement l'image. D'où la nécessité de méthodes basées sur le gradient."
  },
  {
    ch: 3, topic: "Evasion — Intro",
    q: "Quelle est la différence entre une attaque 'targeted' et 'untargeted' ?",
    opts: [
      "Targeted utilise le gradient, untargeted utilise du bruit aléatoire",
      "Targeted force la classification vers une classe-cible spécifique ; untargeted provoque n'importe quelle erreur",
      "Targeted fonctionne uniquement en white-box, untargeted en black-box",
      "Il n'y a pas de différence pratique"
    ],
    ans: 1,
    expl: "Targeted: l'attaquant veut une erreur spécifique (ex: STOP → vitesse 45). Untargeted: n'importe quelle erreur suffit — plus facile car il suffit de franchir la frontière la plus proche."
  },

  // ═══ CHAPITRE 4: WHITE-BOX ATTACKS ═══
  {
    ch: 4, topic: "White-Box Attacks",
    q: "Quelle est la formule du FGSM (Fast Gradient Sign Method) ?",
    opts: [
      "x_adv = x - ε · ∇_x J(θ, x, y)",
      "x_adv = x + ε · sign(∇_x J(θ, x, y))",
      "x_adv = x + ε · random(0, 1)",
      "x_adv = x · (1 + ε · sign(∇_x J))"
    ],
    ans: 1,
    expl: "FGSM maximise la loss en faisant UN PAS dans la direction du signe du gradient. Le sign() rend chaque composante ±ε, ce qui correspond à une perturbation L∞."
  },
  {
    ch: 4, topic: "White-Box Attacks",
    q: "Qu'est-ce qui différencie le PGD du FGSM ?",
    opts: [
      "Le PGD utilise une norme L2 au lieu de L∞",
      "Le PGD est un FGSM itératif avec projection dans la boule ε et initialisation aléatoire",
      "Le PGD ne nécessite pas de gradients",
      "Le PGD est plus rapide que le FGSM"
    ],
    ans: 1,
    expl: "PGD = FGSM itératif + projection Π_B(x,ε) à chaque pas + initialisation aléatoire. Il trouve des perturbations beaucoup plus fortes. Robustesse au FGSM sans robustesse au PGD = gradient masking."
  },
  {
    ch: 4, topic: "White-Box Attacks",
    q: "Pourquoi l'attaque C&W (Carlini & Wagner) est-elle considérée comme le 'gold standard' ?",
    opts: [
      "C'est l'attaque la plus rapide",
      "Elle minimise directement la norme de la perturbation tout en garantissant l'erreur de classification",
      "Elle ne nécessite pas de gradient",
      "Elle fonctionne uniquement sur les images"
    ],
    ans: 1,
    expl: "C&W formule l'attaque comme un problème d'optimisation qui minimise ||δ|| sous contrainte de succès. Utilise la variable w (changement de variable via tanh) pour les box constraints. Framework rigoureux pour évaluer les défenses."
  },
  {
    ch: 4, topic: "White-Box Attacks",
    q: "Qu'est-ce qu'une perturbation adversariale universelle (UAP) ?",
    opts: [
      "Une perturbation qui fonctionne uniquement sur un seul modèle",
      "Une perturbation spécifique à chaque image",
      "Une seule perturbation δ qui trompe le modèle sur de multiples entrées différentes",
      "Une perturbation qui modifie les poids du modèle"
    ],
    ans: 2,
    expl: "L'UAP est une perturbation unique, pré-calculée, applicable à n'importe quelle entrée. Elle démontre des vulnérabilités structurelles dans les représentations apprises par le modèle."
  },
  {
    ch: 4, topic: "White-Box Attacks",
    q: "Quelle norme L_p crée une géométrie en forme de cube autour du point original ?",
    opts: [
      "L0",
      "L1",
      "L2",
      "L∞"
    ],
    ans: 3,
    expl: "L∞ limite chaque dimension à ±ε, créant un hypercube. L2 crée une sphère, L1 un losange/octaèdre, et L0 des points sur les axes coordonnés."
  },
  {
    ch: 4, topic: "White-Box Attacks",
    q: "Quelle est l'approche de DeepFool pour générer des perturbations adversariales ?",
    opts: [
      "Il utilise le signe du gradient comme FGSM",
      "Il projette itérativement sur l'hyperplan tangent à la frontière de décision pour trouver la perturbation minimale",
      "Il ajoute du bruit gaussien croissant",
      "Il entraîne un réseau générateur d'adversariaux"
    ],
    ans: 1,
    expl: "DeepFool linéarise itérativement la frontière de décision et calcule la projection orthogonale minimale pour la franchir. Il produit des perturbations plus petites que FGSM/PGD."
  },

  // ═══ CHAPITRE 5: BLACK-BOX ═══
  {
    ch: 5, topic: "Black-Box Attacks",
    q: "Qu'est-ce que la 'transférabilité' dans le contexte des attaques adversariales ?",
    opts: [
      "La capacité de transférer un modèle d'un serveur à un autre",
      "Le fait que les exemples adversariaux générés contre un modèle A trompent souvent un autre modèle B",
      "La capacité de convertir une attaque L2 en attaque L∞",
      "Le transfert des données d'entraînement entre modèles"
    ],
    ans: 1,
    expl: "La transférabilité permet des attaques black-box : l'attaquant génère des adversariaux en white-box sur un modèle surrogate, puis les transfère au modèle cible. En 2026, les Foundation Models amplifient ce phénomène."
  },
  {
    ch: 5, topic: "Black-Box Attacks",
    q: "Dans l'attaque de Papernot (Practical Black-Box), quelle est l'étape clé ?",
    opts: [
      "Modifier directement les poids du modèle cible",
      "Collecter des paires (input, output) via l'API, entraîner un modèle surrogate, puis générer des adversariaux en white-box sur celui-ci",
      "Scanner les ports réseau du serveur",
      "Utiliser une attaque par force brute sur chaque pixel"
    ],
    ans: 1,
    expl: "L'attaque de Papernot : 1) collecter paires via API, 2) entraîner surrogate, 3) générer adversariaux en white-box sur le surrogate, 4) transférer au modèle cible. Taux de succès ~84%."
  },
  {
    ch: 5, topic: "Black-Box Attacks",
    q: "Quelle méthode black-box moderne utilise des perturbations en blocs carrés aléatoires sans estimation de gradient ?",
    opts: [
      "SimBA",
      "HopSkipJump",
      "Square Attack",
      "Boundary Attack"
    ],
    ans: 2,
    expl: "Le Square Attack perturbe de nombreux pixels simultanément (un carré, pas pixel par pixel) et vérifie si la probabilité de la classe correcte diminue. Très query-efficient."
  },

  // ═══ CHAPITRE 6: DEFENSES ═══
  {
    ch: 6, topic: "Défenses",
    q: "Comment se formule mathématiquement l'adversarial training ?",
    opts: [
      "max_θ E[L(f(x;θ), y)]",
      "min_θ E[ max_{||δ||≤ε} L(f(x+δ;θ), y) ]  — optimisation min-max",
      "min_θ E[L(f(x;θ), y)] + λ||θ||²",
      "min_δ ||f(x+δ) - f(x)||"
    ],
    ans: 1,
    expl: "L'adversarial training est une optimisation min-max (robust optimization) : la boucle interne trouve le pire adversarial (PGD), la boucle externe met à jour les poids pour y résister."
  },
  {
    ch: 6, topic: "Défenses",
    q: "Quel est le principal problème de la Defensive Distillation ?",
    opts: [
      "Elle est trop lente à entraîner",
      "Elle nécessite trop de données",
      "Carlini & Wagner ont montré qu'elle est facilement contournée par des attaques adaptatives",
      "Elle ne fonctionne que sur les images en noir et blanc"
    ],
    ans: 2,
    expl: "C&W a démontré que la defensive distillation, malgré la réduction des gradients via une température T élevée dans le softmax, est facilement contournée. L'adversarial training est considéré plus robuste."
  },
  {
    ch: 6, topic: "Défenses",
    q: "Comment fonctionne le Feature Squeezing ?",
    opts: [
      "Il entraîne le modèle avec des exemples adversariaux",
      "Il réduit la dimensionnalité de l'entrée avec PCA",
      "Il compare la prédiction avant et après compression (bit-depth, smoothing) — si la différence est grande, l'entrée est adversariale",
      "Il utilise un réseau de détection séparé"
    ],
    ans: 2,
    expl: "Feature Squeezing détecte les adversariaux : une image propre change peu avec le squeezing (réduction de bit-depth, filtrage médian), mais une image adversariale dépend de perturbations haute fréquence détruites par la compression."
  },
  {
    ch: 6, topic: "Défenses",
    q: "Qu'est-ce que l'Expectation over Transformation (EoT) ?",
    opts: [
      "Une méthode de data augmentation",
      "Un ataque adaptatif qui contourne la randomisation en calculant le gradient moyen sur N réalisations aléatoires",
      "Une technique d'entraînement distribué",
      "Un type de regularisation"
    ],
    ans: 1,
    expl: "EoT calcule ∇_x E_t[L(f(t(x+δ)),y)] ≈ (1/N) Σ ∇_x L(f(t_i(x+δ)),y) avec N=30-50 échantillons. Le gradient moyen pointe dans la bonne direction malgré la randomisation."
  },
  {
    ch: 6, topic: "Défenses",
    q: "Que sont les 'obfuscated gradients' et pourquoi sont-ils dangereux ?",
    opts: [
      "Des gradients encryptés pour protéger le modèle",
      "Des défenses qui masquent les gradients, donnant une fausse impression de sécurité — BPDA les contourne",
      "Des gradients calculés avec une précision réduite pour économiser la mémoire",
      "Des gradients utilisés uniquement pendant l'inférence"
    ],
    ans: 1,
    expl: "Le gradient masking/obfuscation donne une fausse sécurité. BPDA (Backward Pass Differentiable Approximation) les contourne. Règle d'or : toujours évaluer les défenses contre des attaques adaptatives."
  },

  // ═══ CHAPITRE 8: CERTIFIED ROBUSTNESS ═══
  {
    ch: 8, topic: "Robustesse Certifiée",
    q: "Quelle est la question fondamentale posée par la robustesse certifiée ?",
    opts: [
      "Mon modèle est-il précis sur les données de test ?",
      "Mon modèle résiste-t-il au PGD ?",
      "Peut-on prouver mathématiquement qu'aucune attaque n'existe pour cette entrée dans un rayon ε ?",
      "Le modèle peut-il être déployé en production ?"
    ],
    ans: 2,
    expl: "La robustesse certifiée vise une garantie mathématique : prouver qu'aucune perturbation ||δ||≤ε ne peut changer la prédiction. Indépendante de l'attaque utilisée."
  },
  {
    ch: 8, topic: "Robustesse Certifiée",
    q: "Pourquoi la constante de Lipschitz donne-t-elle des rayons certifiés trop petits en pratique pour les réseaux profonds ?",
    opts: [
      "Parce que ReLU a une constante de Lipschitz infinie",
      "Parce que K_total = K₁ · K₂ · ... · K_L (produit des couches) explose en profondeur",
      "Parce que la constante ne peut pas être calculée",
      "Parce qu'elle ne s'applique qu'aux réseaux linéaires"
    ],
    ans: 1,
    expl: "La constante globale est le produit des constantes de chaque couche. Même si ReLU a K=1, les couches linéaires peuvent avoir K>1, et le produit explose → bornes lâches → rayons trivialement petits."
  },
  {
    ch: 8, topic: "Robustesse Certifiée",
    q: "Comment fonctionne le Randomized Smoothing (Lissage Aléatoire) ?",
    opts: [
      "Il supprime les pixels bruyants de l'image",
      "Il ajoute du bruit gaussien à l'entrée et fait un vote majoritaire sur N échantillons, donnant un rayon certifié R = σ · Φ⁻¹(p_c)",
      "Il lisse les poids du réseau avec une moyenne mobile",
      "Il applique un filtre passe-bas au gradient"
    ],
    ans: 1,
    expl: "g(x) = argmax_c P(f(x+ε)=c), ε~N(0,σ²I). Le rayon certifié R = σ·Φ⁻¹(p_c) où p_c est la probabilité de la classe majoritaire. Plus σ est grand → plus R est grand mais moins le modèle est précis."
  },
  {
    ch: 8, topic: "Robustesse Certifiée",
    q: "Pourquoi le cercle certifié peut-il visuellement dépasser la frontière de f(x) sans invalider la garantie ?",
    opts: [
      "C'est une erreur dans le théorème",
      "La certification porte sur le modèle lissé g(x) qui a une frontière de décision différente de f(x)",
      "Le rayon est calculé avec une marge d'erreur",
      "La frontière de f(x) se déplace pendant la certification"
    ],
    ans: 1,
    expl: "Le théorème certifie g(x), pas f(x). Le bruit gaussien 'arrondit' la frontière de décision de g. Ce qui semble paradoxal visuellement est mathématiquement correct — c'est notre visualisation qui est trompeuse."
  },

  // ═══ CHAPITRE 9: PRIVACY ═══
  {
    ch: 9, topic: "Privacité",
    q: "Que signifie K-Anonymité avec K=3 ?",
    opts: [
      "Les données sont encryptées avec 3 clés",
      "Chaque combinaison de quasi-identifiants apparaît dans au moins 3 enregistrements",
      "Le dataset est divisé en 3 parties",
      "Le modèle a 3 couches de sécurité"
    ],
    ans: 1,
    expl: "K=3 signifie que pour chaque combinaison de quasi-identifiants (âge, CP, genre...), il y a au moins 2 autres personnes identiques → on se 'cache dans la foule'. Tradeoff : plus K est grand, plus de vie privée mais moins d'utilité."
  },
  {
    ch: 9, topic: "Privacité",
    q: "Quelle est la principale limitation de la K-Anonymité ?",
    opts: [
      "Elle est trop coûteuse à calculer",
      "Si tous les individus d'un groupe K ont le même attribut sensible, K ne protège pas cet attribut (→ L-Diversité)",
      "Elle ne fonctionne que pour les données numériques",
      "Elle nécessite un K supérieur à 1000"
    ],
    ans: 1,
    expl: "L-Diversité exige que l'attribut sensible soit diversifié au sein du groupe K. T-Closeness va plus loin : la distribution de l'attribut sensible dans le groupe doit être proche de la distribution globale."
  },
  {
    ch: 9, topic: "Privacité",
    q: "Que garantit la Differential Privacy formellement ?",
    opts: [
      "Que le dataset est anonymisé à 100%",
      "Que P[M(D)∈S] ≤ e^ε · P[M(D')∈S] + δ — la sortie change très peu si un individu est ajouté ou retiré",
      "Que le modèle ne peut pas être volé",
      "Que les gradients sont toujours positifs"
    ],
    ans: 1,
    expl: "DP garantit que la sortie du mécanisme M change très peu (contrôlé par ε) si un individu est ajouté/retiré du dataset. ε petit = plus de vie privée mais moins d'utilité. ε=1 est considéré fort, ε=10 est faible."
  },
  {
    ch: 9, topic: "Privacité",
    q: "Quelles sont les deux étapes clés du DP-SGD ?",
    opts: [
      "Augmenter les données et réduire le learning rate",
      "Clipper les gradients individuels et ajouter du bruit gaussien aux gradients agrégés",
      "Encrypter les poids et décrypter les sorties",
      "Normaliser les entrées et quantizer les sorties"
    ],
    ans: 1,
    expl: "DP-SGD (Abadi et al., 2016) : 1) Clipper les gradients individuels pour limiter la contribution de chaque exemple. 2) Ajouter du bruit gaussien aux gradients agrégés. Un accountant traque le budget ε."
  },

  // ═══ TRANSVERSAL ═══
  {
    ch: 0, topic: "Transversal",
    q: "Selon le principe de Kerckhoffs appliqué au ML, que doit-on toujours supposer lors de l'évaluation d'une défense ?",
    opts: [
      "Que l'attaquant n'a aucune connaissance du système",
      "Que l'attaquant a un accès complet (white-box) — pire cas pour le défenseur",
      "Que l'attaquant utilise uniquement du bruit aléatoire",
      "Que le modèle est parfaitement entraîné"
    ],
    ans: 1,
    expl: "Les attaques white-box représentent le pire cas. Si une défense ne survit pas au white-box, elle n'offre pas de robustesse réelle. C'est le principe fondamental pour évaluer honnêtement les défenses."
  },
  {
    ch: 0, topic: "Transversal",
    q: "Pourquoi l'accuracy seule est-elle insuffisante comme métrique de sécurité d'un modèle ?",
    opts: [
      "L'accuracy est toujours de 100% sur les données de test",
      "L'accuracy ne détecte pas le poisoning, les backdoors, ni la vulnérabilité aux adversariaux — un modèle avec 99% d'accuracy peut être complètement vulnérable",
      "L'accuracy ne peut pas être calculée pour les réseaux profonds",
      "L'accuracy n'est utilisée que pour la classification binaire"
    ],
    ans: 1,
    expl: "Un modèle backdooré a une accuracy normale sur données propres. Un modèle vulnérable aux adversariaux peut avoir 99% d'accuracy. Des métriques spécialisées (adversarial accuracy, certified radius) sont nécessaires."
  },
];
