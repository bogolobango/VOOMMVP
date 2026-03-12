export const VOOM_WHATSAPP_NUMBER = "233XXXXXXXXX";

export function openWhatsApp(phoneNumber: string, message: string = "") {
  const cleaned = phoneNumber.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${cleaned}?text=${encoded}`, "_blank");
}

export function reserveCarOnWhatsApp(
  carMake: string,
  carModel: string,
  dailyRate: number,
  currency: string,
  location: string,
  startDate?: Date | null,
  endDate?: Date | null,
  hostPhone?: string | null,
) {
  const number = hostPhone ? hostPhone.replace(/\D/g, "") : VOOM_WHATSAPP_NUMBER;
  const carName = `${carMake} ${carModel}`;
  const price = `${dailyRate} ${currency || "GHS"}`;
  const startStr = startDate
    ? startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "TBD";
  const endStr = endDate
    ? endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "TBD";

  const message =
    `Hi! I'd like to book a car on VOOM 🚗\n\n` +
    `🚘 Car: ${carName}\n` +
    `📍 Location: ${location}\n` +
    `💰 Rate: ${price}/day\n` +
    `📅 From: ${startStr}\n` +
    `📅 To: ${endStr}\n\n` +
    `Please confirm availability. Thank you!`;

  openWhatsApp(number, message);
}

export function contactHostOnWhatsApp(carMake: string, carModel: string, hostPhone?: string | null) {
  const number = hostPhone ? hostPhone.replace(/\D/g, "") : VOOM_WHATSAPP_NUMBER;
  const message = `Hi! I'm interested in renting your ${carMake} ${carModel} listed on Voom. Is it still available?`;
  openWhatsApp(number, message);
}

export function contactVoomSupport(subject: string = "") {
  const message = subject
    ? `Hi Voom support! I need help with: ${subject}`
    : "Hi Voom support! I need some help.";
  openWhatsApp(VOOM_WHATSAPP_NUMBER, message);
}
