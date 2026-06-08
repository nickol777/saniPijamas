// db.js - Gestión del catálogo de SANI PIJAMAS con Firebase e ImgBB
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. CONFIGURACIÓN DE TU BASE DE DATOS DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCBzLeH0xC7BUKOk79PxSCAIQ3HxTzb1iA",
  authDomain: "sanipijamasdb.firebaseapp.com",
  projectId: "sanipijamasdb",
  storageBucket: "sanipijamasdb.firebasestorage.app",
  messagingSenderId: "177319122682",
  appId: "1:177319122682:web:98d45a8c862b2fbca3db43",
  measurementId: "G-1CZ3K3831H"
};

// 2. CONFIGURACIÓN DE APIS REALES
const IMGBB_API_KEY = "fd25ac019aca9ad75a4001e66a5dd4ce"; 
const WHATSAPP_PHONE = "573332244628"; 

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencias del DOM
const catalogContainer = document.getElementById('catalogContainer');
const productForm = document.getElementById('productForm');
const adminPanel = document.getElementById('adminPanel');

// Arreglo global para manejar los productos en memoria local temporal
let localProducts = [];

// 3. FUNCIÓN PARA LEER LOS PRODUCTOS DE FIREBASE Y PINTARLOS
async function renderCatalog() {
    catalogContainer.innerHTML = '<div class="text-center w-100 fw-bold my-4">Cargando prendas hermosas... 🌸</div>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "productos"));
        catalogContainer.innerHTML = '';
        localProducts = []; // Reiniciar arreglo local

        if (querySnapshot.empty) {
            catalogContainer.innerHTML = '<div class="text-center w-100 text-muted my-4">Aún no hay prendas en el catálogo. ¡Modo Admin para agregar! ✨</div>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const product = docSnap.data();
            const id = docSnap.id;
            
            // Guardamos el id de Firebase junto con los datos del producto
            localProducts.push({ id, ...product });
        });

        // Dibujar las tarjetas en el HTML
        localProducts.forEach((product, index) => {
            let sizesArray = Array.isArray(product.sizes) ? product.sizes : product.sizes.split(',');
            let sizesHTML = sizesArray.map(size => `<span class="badge badge-talla rounded">${size.trim()}</span>`).join('');

            let whatsappText = encodeURIComponent(`¡Hola Sani! Me interesa la "${product.name}". ¿Está disponible?`);
            let whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${whatsappText}`;

            const isAdminVisible = !adminPanel.classList.contains('d-none');
            let adminButtons = '';
            
            if (isAdminVisible) {
                adminButtons = `
                    <div class="mt-3 pt-2 border-top d-flex justify-content-between">
                        <button class="btn btn-sm btn-outline-primary edit-btn" data-index="${index}"><i class="bi bi-pencil-square"></i> Editar</button>
                        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${product.id}"><i class="bi bi-trash3"></i> Borrar</button>
                    </div>
                `;
            }

            const cardHTML = `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card product-card border-0 shadow-sm h-100">
                        <img src="${product.image}" class="card-img-top product-img" alt="${product.name}">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title fw-bold text-dark">${product.name}</h5>
                            <p class="card-text text-muted flex-grow-1">${product.desc}</p>
                            <div class="mb-3">
                                <span class="text-muted small d-block mb-1">Tallas disponibles:</span>
                                ${sizesHTML}
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="product-price">$ ${product.price}</span>
                            </div>
                            <a href="${whatsappUrl}" target="_blank" class="btn btn-whatsapp text-center w-100">
                                <i class="bi bi-whatsapp me-2"></i>Me interesa
                            </a>
                            ${adminButtons}
                        </div>
                    </div>
                </div>
            `;
            catalogContainer.innerHTML += cardHTML;
        });

        // Asignar eventos dinámicos a los botones de Editar y Borrar
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteProduct(e.target.dataset.id));
        });
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => editProduct(e.target.dataset.index));
        });

    } catch (error) {
        console.error("Error cargando el catálogo:", error);
        catalogContainer.innerHTML = '<div class="text-center w-100 text-danger my-4">Error al conectar con la base de datos. Recarga la página.</div>';
    }
}

// 4. GUARDAR O EDITAR PRENDA
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const editIndex = document.getElementById('editIndex').value;
    const btnSave = document.getElementById('btnSave');
    
    const name = document.getElementById('prodName').value;
    const price = document.getElementById('prodPrice').value;
    const sizes = document.getElementById('prodSizes').value;
    const desc = document.getElementById('prodDesc').value;
    const imageFile = document.getElementById('prodImageFile').files[0];

    btnSave.innerText = "Subiendo datos... ⏳";
    btnSave.disabled = true;

    try {
        let imageUrl = "";

        if (editIndex !== "-1" && !imageFile) {
            imageUrl = localProducts[parseInt(editIndex)].image;
        } else {
            const formData = new FormData();
            formData.append('image', imageFile);

            // CORREGIDO AQUÍ: Ahora sí usa la variable correcta con tu clave real
            const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            const imgbbData = await imgbbResponse.json();
            
            if (imgbbData.success) {
                imageUrl = imgbbData.data.url;
            } else {
                throw new Error("No se pudo subir la imagen a ImgBB.");
            }
        }

        const productData = {
            name: name,
            price: price,
            sizes: sizes,
            desc: desc,
            image: imageUrl,
            updatedAt: new Date()
        };

        if (editIndex !== "-1") {
            const docId = localProducts[parseInt(editIndex)].id;
            await updateDoc(doc(db, "productos", docId), productData);
            alert("¡Prenda actualizada con éxito! 🎉");
        } else {
            await addDoc(collection(db, "productos"), productData);
            alert("¡Prenda publicada exitosamente en la nube! 🚀");
        }

        productForm.reset();
        document.getElementById('editIndex').value = "-1";
        btnSave.innerText = "Guardar Prenda";
        btnSave.disabled = false;
        renderCatalog();

    } catch (error) {
        console.error("Error al procesar el formulario:", error);
        alert("Ocurrió un error. Revisa la consola del navegador.");
        btnSave.innerText = "Guardar Prenda";
        btnSave.disabled = false;
    }
});

// 5. SECCIÓN DE FUNCIONES GLOBALES (Editar, Borrar, Mostrar Panel)
window.toggleAdminPanel = function() {
    adminPanel.classList.toggle('d-none');
    const imgInput = document.getElementById('prodImageFile');
    if (imgInput) imgInput.required = document.getElementById('editIndex').value === "-1";
    renderCatalog();
};

window.editProduct = function(index) {
    const prod = localProducts[index];
    document.getElementById('editIndex').value = index;
    document.getElementById('prodName').value = prod.name;
    document.getElementById('prodPrice').value = prod.price;
    document.getElementById('prodSizes').value = Array.isArray(prod.sizes) ? prod.sizes.join(', ') : prod.sizes;
    document.getElementById('prodDesc').value = prod.desc;
    document.getElementById('prodImageFile').required = false;
    
    document.getElementById('btnSave').innerText = "Actualizar Prenda";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteProduct = async function(id) {
    if (confirm("¿Estás segura de que deseas eliminar permanentemente esta prenda del catálogo? 😭")) {
        try {
            await deleteDoc(doc(db, "productos", id));
            alert("Prenda eliminada.");
            renderCatalog();
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("No se pudo eliminar la prenda.");
        }
    }
};

// Carga inicial del catálogo al abrir la página web
renderCatalog();