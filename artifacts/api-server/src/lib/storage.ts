import { db } from "@workspace/db";
import {
  users, cars, bookings, favorites, messages, reviews, payments,
  type User, type InsertUser, type Car, type InsertCar,
  type Booking, type InsertBooking, type Favorite, type InsertFavorite,
  type Message, type InsertMessage, type Review, type InsertReview,
  type Payment, type InsertPayment,
} from "@workspace/db";
import { eq, and, or, gte, lte, like, ilike, desc, asc, sql, inArray } from "drizzle-orm";

export const storage = {
  // ===== Users =====

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  },

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  },

  // ===== Cars =====

  async getCars(): Promise<Car[]> {
    return db.select().from(cars).where(eq(cars.status, "active")).orderBy(desc(cars.createdAt));
  },

  async getCar(id: number): Promise<Car | undefined> {
    const [car] = await db.select().from(cars).where(eq(cars.id, id));
    return car;
  },

  async getCarsByHost(hostId: number): Promise<Car[]> {
    return db.select().from(cars).where(and(eq(cars.hostId, hostId), eq(cars.status, "active"))).orderBy(desc(cars.createdAt));
  },

  async createCar(data: InsertCar): Promise<Car> {
    const [car] = await db.insert(cars).values(data).returning();
    return car;
  },

  async updateCar(id: number, data: Partial<InsertCar>): Promise<Car | undefined> {
    const [car] = await db.update(cars).set(data).where(eq(cars.id, id)).returning();
    return car;
  },

  async getCarsWithFilters(filters: {
    minPrice?: number;
    maxPrice?: number;
    category?: string;
    available?: boolean;
    searchQuery?: string;
    sort?: string;
    limit?: number;
    offset?: number;
    make?: string[];
    features?: string[];
    transmission?: string;
    fuelType?: string;
    seats?: number;
    minRating?: number;
  }): Promise<Car[]> {
    let query = db.select().from(cars).$dynamic();
    const conditions = [eq(cars.status, "active")];

    if (filters.available !== undefined) {
      conditions.push(eq(cars.available, filters.available));
    }
    if (filters.minPrice !== undefined) {
      conditions.push(gte(cars.dailyRate, filters.minPrice));
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(lte(cars.dailyRate, filters.maxPrice));
    }
    if (filters.category) {
      conditions.push(ilike(cars.type, `%${filters.category}%`));
    }
    if (filters.searchQuery) {
      const q = `%${filters.searchQuery}%`;
      conditions.push(
        or(ilike(cars.make, q), ilike(cars.model, q), ilike(cars.location, q), ilike(cars.city, q))!
      );
    }
    if (filters.transmission) {
      conditions.push(eq(cars.transmission, filters.transmission));
    }
    if (filters.fuelType) {
      conditions.push(eq(cars.fuelType, filters.fuelType));
    }
    if (filters.seats) {
      conditions.push(eq(cars.seats, filters.seats));
    }
    if (filters.make && filters.make.length > 0) {
      conditions.push(inArray(cars.make, filters.make));
    }

    query = query.where(and(...conditions));

    if (filters.sort === "price_asc") {
      query = query.orderBy(asc(cars.dailyRate));
    } else if (filters.sort === "price_desc") {
      query = query.orderBy(desc(cars.dailyRate));
    } else if (filters.sort === "rating") {
      query = query.orderBy(desc(cars.rating));
    } else {
      query = query.orderBy(desc(cars.createdAt));
    }

    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.offset(filters.offset);

    return query;
  },

  // ===== Bookings =====

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  },

  async getBookingsWithCars(userId: number): Promise<(Booking & { car?: Car })[]> {
    const userBookings = await db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.createdAt));
    const result = await Promise.all(
      userBookings.map(async (b) => {
        const car = await storage.getCar(b.carId);
        return { ...b, car };
      })
    );
    return result;
  },

  async getBookingsByCar(carId: number): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.carId, carId));
  },

  async createBooking(data: Omit<Booking, "id" | "createdAt" | "updatedAt">): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(data as any).returning();
    return booking;
  },

  async updateBooking(id: number, data: Partial<Booking>): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set({ ...data, updatedAt: new Date() } as any).where(eq(bookings.id, id)).returning();
    return booking;
  },

  async hasBookingConflict(carId: number, start: Date, end: Date): Promise<boolean> {
    const conflicts = await db.select().from(bookings).where(
      and(
        eq(bookings.carId, carId),
        or(
          eq(bookings.status, "pending"),
          eq(bookings.status, "approved"),
          eq(bookings.status, "active")
        )!,
        lte(bookings.startDate, end),
        gte(bookings.endDate, start),
      )
    );
    return conflicts.length > 0;
  },

  async getLastBookedCar(userId: number): Promise<number | null> {
    const [lastBooking] = await db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.createdAt)).limit(1);
    return lastBooking?.carId ?? null;
  },

  // ===== Favorites =====

  async getFavoriteCarsByUser(userId: number): Promise<Car[]> {
    const favs = await db.select().from(favorites).where(eq(favorites.userId, userId));
    if (favs.length === 0) return [];
    const carIds = favs.map((f) => f.carId);
    return db.select().from(cars).where(inArray(cars.id, carIds));
  },

  async getFavoriteIds(userId: number): Promise<number[]> {
    const favs = await db.select().from(favorites).where(eq(favorites.userId, userId));
    return favs.map((f) => f.carId);
  },

  async getFavorite(userId: number, carId: number): Promise<Favorite | undefined> {
    const [fav] = await db.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.carId, carId)));
    return fav;
  },

  async createFavorite(data: InsertFavorite): Promise<Favorite> {
    const [fav] = await db.insert(favorites).values(data).returning();
    return fav;
  },

  async deleteFavorite(userId: number, carId: number): Promise<void> {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.carId, carId)));
  },

  // ===== Messages =====

  async getMessageThreads(userId: number): Promise<any[]> {
    // Get all messages involving this user
    const allMessages = await db.select().from(messages).where(
      or(eq(messages.senderId, userId), eq(messages.receiverId, userId))!
    ).orderBy(desc(messages.createdAt));

    // Group by conversation partner
    const threadMap = new Map<number, any>();
    for (const msg of allMessages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!threadMap.has(partnerId)) {
        threadMap.set(partnerId, {
          userId: partnerId,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: (!msg.read && msg.receiverId === userId) ? 1 : 0,
        });
      } else {
        const t = threadMap.get(partnerId)!;
        if (!msg.read && msg.receiverId === userId) t.unreadCount++;
      }
    }

    // Fetch user info for each partner
    const result = [];
    for (const [partnerId, thread] of threadMap) {
      const partner = await storage.getUser(partnerId);
      if (partner) {
        result.push({
          ...thread,
          username: partner.username,
          fullName: partner.fullName,
          profilePicture: partner.profilePicture,
        });
      }
    }
    return result;
  },

  async getConversation(userId: number, partnerId: number): Promise<Message[]> {
    return db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId), eq(messages.receiverId, partnerId)),
        and(eq(messages.senderId, partnerId), eq(messages.receiverId, userId)),
      )!
    ).orderBy(asc(messages.createdAt));
  },

  async sendMessage(data: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(data).returning();
    return msg;
  },

  async markMessagesRead(senderId: number, receiverId: number): Promise<void> {
    await db.update(messages).set({ read: true }).where(
      and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId))
    );
  },

  // ===== Reviews =====

  async getCarReviews(carId: number): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.carId, carId)).orderBy(desc(reviews.createdAt));
  },

  async createReview(data: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(data).returning();
    // Update car rating
    const carReviews = await storage.getCarReviews(data.carId);
    const avgRating = Math.round(carReviews.reduce((sum, r) => sum + r.rating, 0) / carReviews.length);
    await storage.updateCar(data.carId, { rating: avgRating, ratingCount: carReviews.length });
    return review;
  },

  // ===== Payments =====

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(data as any).returning();
    return payment;
  },

  async getPaymentByIdempotencyKey(key: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.idempotencyKey, key));
    return payment;
  },

  async updatePaymentStatus(id: number, status: string, providerPaymentId?: string): Promise<void> {
    await db.update(payments).set({ status, providerPaymentId, updatedAt: new Date() } as any).where(eq(payments.id, id));
  },
};
