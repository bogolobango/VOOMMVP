export const VOOM_WHATSAPP_NUMBER = "233XXXXXXXXX";

export function openWhatsApp(phoneNumber: string, message: string = "") {
  const cleaned = phoneNumber.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${cleaned}?text=${encoded}`, "_blank");
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
