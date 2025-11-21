/**
 * @file คอนโทรลเลอร์สำหรับจัดการคำขอ (HTTP Requests) ที่เกี่ยวข้องกับสินค้า (Product)
 * @description ไฟล์นี้ทำหน้าที่รับคำขอจาก Client, ดึงข้อมูลที่จำเป็นจาก Request (params, query, body, file),
 * เรียกใช้ Product Service ที่เหมาะสมเพื่อจัดการตรรกะ, และส่งผลลัพธ์กลับไปเป็น HTTP Response
 * @module controllers/product
 * @requires services/product.service - Service สำหรับจัดการตรรกะของ Product
 * @requires utils/catchAsync - Utility สำหรับดักจับข้อผิดพลาดใน Asynchronous functions
 * @requires http-status - Library สำหรับจัดการ HTTP status codes
 */
import { Request, Response, NextFunction } from "express";
import productService from "./product.service.js";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync.js";

/**
 * คอนโทรลเลอร์สำหรับดึงรายการสินค้า (สำหรับหน้าแสดงผลหลัก)
 * @description ดึงข้อมูลสินค้าตาม 'mode' (เช่น affordable, upgrade) และกรองตามช่วงราคา
 * ออกแบบมาเพื่อใช้ในส่วนแสดงผลสำหรับผู้ใช้ทั่วไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่อาจมี `req.query` (mode, minPrice, maxPrice, sort)
 * @param {object} res - อ็อบเจกต์ Express Response
 * @param {function} next - ฟังก์ชัน Express next middleware
 */
const listProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { mode = "affordable", min, max, minPrice: minPriceQ, maxPrice: maxPriceQ, sort } = req.query;

        // resolve numbers (null means "no bound")
        let minPrice = min != null ? Number(min) : minPriceQ != null ? Number(minPriceQ) : null;
        let maxPrice = max != null ? Number(max) : maxPriceQ != null ? Number(maxPriceQ) : null;

        // preset behaviors (you can keep or tweak)
        if (mode === "affordable") {
            // keep minPrice as-is; cap by maxPrice if provided
            // (frontend usually sets maxPrice to their capacity)
        } else if (mode === "upgrade") {
            // keep maxPrice as-is; leave unbounded if not provided
        } // mode "all" leaves both as given

        const data = await productService.fetchProducts({
            minPrice,
            maxPrice,
            sort: sort === "desc" ? "desc" : "asc",
        });

        return res.status(httpStatus.OK).json(data);
    } catch (err) {
        next(err);
    }
};

/**
 * คอนโทรลเลอร์สำหรับดึงรายการสินค้าพร้อม Filter และ Pagination (สำหรับ Admin)
 * @description รับเงื่อนไขการกรองที่ซับซ้อน (search, brand, capacity, color) และการแบ่งหน้าจาก Query String,
 * เรียกใช้ Service, และส่งรายการสินค้าพร้อมข้อมูลการแบ่งหน้ากลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.query`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getProducts = catchAsync(async (req: Request, res: Response) => {
    // รับ options (page, pageSize, search, brand, sort) จาก query string
    const { page = 1, pageSize = 10, search, brand, condition, capacity, color, sort } = req.query;
    const result = await productService.getProducts({
        page: page as string,
        pageSize: pageSize as string,
        search: search as string,
        brand: brand as string,
        condition: condition as string,
        capacity: capacity as string,
        color: color as string,
        sort: sort as string,
    });
    res.status(httpStatus.OK).json(result);
});

/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลตัวเลือกสำหรับสร้าง Filter UI
 * @description เรียกใช้ Service เพื่อดึงค่าที่ไม่ซ้ำกันทั้งหมดของ brand, capacity, และ color
 * เพื่อนำไปใช้สร้างเป็นตัวเลือกในหน้าจอค้นหาสินค้า
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getProductFilters = catchAsync(async (req: Request, res: Response) => {
    const filters = await productService.getProductFilters();
    res.status(httpStatus.OK).json(filters);
});

/**
 * คอนโทรลเลอร์สำหรับสร้างสินค้าใหม่
 * @description รับข้อมูลสินค้าจาก Request Body, เรียกใช้ Service เพื่อสร้างสินค้า,
 * และส่งข้อมูลสินค้าที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมีข้อมูลสินค้าใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const createProduct = catchAsync(async (req: Request, res: Response) => {
    const productData = req.body;
    const newProduct = await productService.createProduct(productData);
    res.status(httpStatus.CREATED).json(newProduct);
});

/**
 * คอนโทรลเลอร์สำหรับแก้ไขข้อมูลสินค้า
 * @description รับ `productId` จาก URL parameters, ข้อมูลสำหรับอัปเดตจาก Request Body,
 * และไฟล์รูปภาพ (ถ้ามี) จาก `req.file` จากนั้นเรียกใช้ Service เพื่ออัปเดตข้อมูล
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.productId`, `req.body`, และ `req.file`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const editProduct = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const updatedProduct = await productService.editProduct(productId, req.file, req.body);
    res.status(httpStatus.OK).json(updatedProduct);
});

/**
 * คอนโทรลเลอร์สำหรับลบสินค้า
 * @description รับ `productId` จาก URL parameters, เรียกใช้ Service เพื่อลบสินค้า,
 * และส่งสถานะ 204 (No Content) กลับไปเมื่อดำเนินการสำเร็จ
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.productId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const deleteProduct = catchAsync(async (req: Request, res: Response) => {
    // ดึง productId จาก URL parameters
    const { productId } = req.params;
    await productService.deleteProduct(productId);
    // เมื่อลบสำเร็จ ส่ง status 204 No Content กลับไป ซึ่งหมายถึงสำเร็จแต่ไม่มีข้อมูลจะส่งกลับ
    res.status(httpStatus.NO_CONTENT).send();
});

export default {
    listProducts,
    getProducts,
    getProductFilters,
    createProduct,
    editProduct,
    deleteProduct,
};
