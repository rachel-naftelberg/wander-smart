// City Pass Optimizer & Ticket Cost Engine - WanderSmart
// Calculates total itinerary expenses across passes and advises the cheapest payment strategy.

const PricingEngine = {
  // Get pricing details for a single attraction
  getAttractionPricing(attraction) {
    const regular = attraction.pricing ? attraction.pricing.regular : 0;
    const viennaPassCost = (attraction.pricing && attraction.pricing.viennaPass === 0) ? 0 : regular;
    const discount = (attraction.pricing && attraction.pricing.viennaCityCardDiscount) ? attraction.pricing.viennaCityCardDiscount : 0;
    const viennaCityCardCost = Math.max(0, regular - discount);

    return {
      regular,
      viennaPassCost,
      viennaPassCovered: viennaPassCost === 0 && regular > 0,
      viennaCityCardCost,
      discountAmount: discount,
      flexiEligible: !!(attraction.pricing && attraction.pricing.viennaFlexiPassEligible)
    };
  },

  // Calculate total costs for a list of attractions
  calculateTotals(attractions, options = {}) {
    let regularSum = 0;
    let coveredByViennaPassCount = 0;
    let viennaPassRemainingSum = 0;
    let cityCardDiscountSum = 0;
    const eligibleForFlexi = [];

    attractions.forEach(att => {
      const p = this.getAttractionPricing(att);
      regularSum += p.regular;

      if (p.viennaPassCovered) {
        coveredByViennaPassCount++;
      } else {
        viennaPassRemainingSum += p.regular;
      }

      cityCardDiscountSum += p.viennaCityCardCost;

      if (p.flexiEligible && p.regular > 0) {
        eligibleForFlexi.push({ id: att.id, name: att.nameHe, price: p.regular });
      }
    });

    // Sort flexi candidates by price descending
    eligibleForFlexi.sort((a, b) => b.price - a.price);

    // Vienna Pass option (for 2 days or 3 days as baseline)
    const viennaPass2DayCost = VIENNA_DATA.cityPasses.viennaPass.prices[2]; // 124
    const viennaPass3DayCost = VIENNA_DATA.cityPasses.viennaPass.prices[3]; // 154
    const viennaPassTotal2Day = viennaPass2DayCost + viennaPassRemainingSum;
    const viennaPassTotal3Day = viennaPass3DayCost + viennaPassRemainingSum;

    // Vienna City Card 72h option: €29 card + discounted tickets + transit saving (transit in Vienna is €8.60/day x 3 = ~€25.80 value!)
    const cityCard72hCost = VIENNA_DATA.cityPasses.viennaCityCard.prices[3]; // 29
    const cityCardTotal = cityCard72hCost + cityCardDiscountSum;

    // Vienna Flexi Pass 3 or 4 attractions
    let flexi3CoveredValue = 0;
    eligibleForFlexi.slice(0, 3).forEach(x => { flexi3CoveredValue += x.price; });
    const flexi3Cost = VIENNA_DATA.cityPasses.viennaFlexiPass.prices[3] + (regularSum - flexi3CoveredValue);

    let flexi4CoveredValue = 0;
    eligibleForFlexi.slice(0, 4).forEach(x => { flexi4CoveredValue += x.price; });
    const flexi4Cost = VIENNA_DATA.cityPasses.viennaFlexiPass.prices[4] + (regularSum - flexi4CoveredValue);

    return {
      regularSum,
      coveredByViennaPassCount,
      viennaPass2DayCost,
      viennaPassTotal2Day,
      viennaPassTotal3Day,
      cityCardTotal,
      cityCardDiscountSum,
      flexi3Cost,
      flexi4Cost,
      eligibleForFlexi
    };
  },

  // Generate intelligent "How to pay cheapest" advice
  getBestPaymentAdvice(attractions) {
    const totals = this.calculateTotals(attractions);
    const options = [
      {
        id: "regular",
        title: "קניית כרטיסים נפרדים בקופות / אונליין",
        badge: "ללא התחייבות",
        cost: totals.regularSum,
        transitIncluded: false,
        savings: 0,
        explanation: "קנייה נפרדת של כל אתר. מתאים אם אתם מתכוונים להיכנס למספר מועט מאוד של אתרים בתשלום."
      },
      {
        id: "city_card_72h",
        title: "Vienna City Card (72 שעות) + כרטיסים מוזלים",
        badge: "משתלם ביותר וכולל תחבורה חופשית!",
        cost: totals.cityCardTotal,
        transitIncluded: true,
        transitValue: 25.8, // 3 days of unlimited transit
        savings: (totals.regularSum + 25.8) - totals.cityCardTotal,
        explanation: "כולל נסיעה חופשית מלאה בכל הרכבות התחתיות, החשמליות והאוטובוסים (שווי של כ-26€) + הנחות של 15%-20% בכל הארמונות והמוזיאונים."
      },
      {
        id: "vienna_pass_2day",
        title: "Vienna Pass ליומיים אינטנסיביים (ימים 1-2)",
        badge: "הכי נוח - כניסה חופשית ותור מהיר",
        cost: totals.viennaPassTotal2Day,
        transitIncluded: false,
        savings: totals.regularSum - totals.viennaPassTotal2Day,
        explanation: "כניסה חופשית ודילוג על תורים לארמון שונברון, בלוודר, הופבורג, גלגל הענק ועוד. מומלץ לרכז את האתרים היקרים ביומיים הראשונים."
      },
      {
        id: "flexi_4",
        title: "Vienna Flexi Pass (4 אטרקציות יקרות)",
        badge: "גמישות מרבית",
        cost: totals.flexi4Cost,
        transitIncluded: false,
        savings: totals.regularSum - totals.flexi4Cost,
        explanation: "מכסה את 4 האתרים היקרים ביותר (שונברון, בלוודר, הופבורג, גלגל הענק) ב-67€, ושאר האתרים חינם או בודדים."
      }
    ];

    // Find option with lowest net cost (taking transit value into consideration)
    let bestOption = options[0];
    let minNetCost = totals.regularSum + 25.8; // baseline: tickets + transit

    options.forEach(opt => {
      const netEffectiveCost = opt.transitIncluded ? opt.cost : (opt.cost + 25.8);
      if (netEffectiveCost < minNetCost) {
        minNetCost = netEffectiveCost;
        bestOption = opt;
      }
    });

    return {
      totals,
      options,
      bestOption,
      recommendationText: `האפשרות המשתלמת ביותר עבור המסלול שלך היא **${bestOption.title}**! החיסכון הכולל מוערך בכ-**${Math.max(0, Math.round(bestOption.savings))} €** כולל נסיעות.`
    };
  }
};

if (typeof window !== 'undefined') {
  window.PricingEngine = PricingEngine;
}
