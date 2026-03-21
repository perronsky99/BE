const Category = require('../models/Category');

// GET /api/categories - Listar categorías activas
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean();
    
    // Organizar jerárquicamente
    const roots = categories.filter(c => !c.parent);
    const children = categories.filter(c => c.parent);
    
    const tree = roots.map(root => ({
      ...root,
      children: children.filter(c => String(c.parent) === String(root._id))
    }));

    res.json({ categories: tree });
  } catch (error) {
    next(error);
  }
};

// POST /api/categories - Crear categoría (admin)
const createCategory = async (req, res, next) => {
  try {
    const { name, slug, parent, icon, order } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({ message: 'Nombre y slug son requeridos' });
    }

    const existing = await Category.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Ya existe una categoría con ese slug' });
    }

    const category = await Category.create({
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      parent: parent || null,
      icon: icon || 'category',
      order: order || 0
    });

    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/categories/:id - Actualizar categoría (admin)
const updateCategory = async (req, res, next) => {
  try {
    const { name, icon, order, isActive } = req.body;
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    if (name !== undefined) category.name = name.trim();
    if (icon !== undefined) category.icon = icon;
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    res.json({ category });
  } catch (error) {
    next(error);
  }
};

// Seed inicial de categorías
const seedCategories = async (req, res, next) => {
  try {
    const count = await Category.countDocuments();
    if (count > 0) {
      return res.json({ message: 'Categorías ya existen', count });
    }

    const seeds = [
      { name: 'Servicios del Hogar', slug: 'servicios-hogar', icon: 'home_repair_service', order: 1 },
      { name: 'Plomería', slug: 'plomeria', icon: 'plumbing', order: 1, parent: null },
      { name: 'Electricidad', slug: 'electricidad', icon: 'electrical_services', order: 2 },
      { name: 'Limpieza', slug: 'limpieza', icon: 'cleaning_services', order: 3 },
      { name: 'Tecnología', slug: 'tecnologia', icon: 'computer', order: 4 },
      { name: 'Diseño', slug: 'diseno', icon: 'design_services', order: 5 },
      { name: 'Transporte', slug: 'transporte', icon: 'local_shipping', order: 6 },
      { name: 'Educación', slug: 'educacion', icon: 'school', order: 7 },
      { name: 'Comunidad', slug: 'comunidad', icon: 'groups', order: 8 },
      { name: 'Otros', slug: 'otros', icon: 'more_horiz', order: 99 }
    ];

    await Category.insertMany(seeds);
    res.status(201).json({ message: 'Categorías creadas', count: seeds.length });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCategories, createCategory, updateCategory, seedCategories };
