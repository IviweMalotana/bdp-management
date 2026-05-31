using BDP.API.Data;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Services;

public static class ProductNameService
{
    // 300+ diverse global names — men, women, boys, girls from all cultures
    private static readonly string[] NamePool = new[]
    {
        // African
        "Amara", "Zara", "Nia", "Kofi", "Kwame", "Adaeze", "Chioma", "Zanele", "Thandi",
        "Lerato", "Nomsa", "Sipho", "Bongani", "Thabo", "Yolanda", "Naledi", "Kagiso",
        "Palesa", "Thandeka", "Mandla", "Ayasha", "Imani", "Makena", "Zawadi", "Dalila",
        "Amina", "Fatima", "Layla", "Nadia", "Zainab", "Khadija", "Halima", "Mariam",
        // European
        "Julia", "Elena", "Sofia", "Luna", "Aria", "Iris", "Nova", "Stella", "Zoe",
        "Mia", "Leo", "Max", "Felix", "Nina", "Lena", "Marcus", "Clara", "Rose",
        "Violet", "Elise", "Ivy", "Grace", "Naomi", "Chloe", "Freya", "Astrid",
        "Sigrid", "Ingrid", "Erik", "Bjorn", "Nora", "Vera", "Ada", "Alba",
        "Dora", "Lila", "Mila", "Sasha", "Talia", "Uma", "Willa",
        "Xena", "Yara", "Zelda", "Anton", "Bruno", "Carlo", "Dante", "Emil",
        "Franz", "Gustav", "Hans", "Ivan", "Josef", "Klaus", "Lars", "Milan",
        // Asian
        "Mei", "Yuki", "Hana", "Keiko", "Suki", "Aiko", "Ren", "Kai", "Jin",
        "Wei", "Yuna", "Sena", "Mika", "Haru", "Sora", "Yami", "Kira", "Riku",
        "Nana", "Rena", "Saki", "Yui", "Emi", "Kana", "Nao", "Rei", "Saho",
        "Tomo", "Aya", "Chie", "Fumi", "Gina", "Hisa", "Iku", "Juri", "Kayo",
        // Latin & South American
        "Carmen", "Rosa", "Diego", "Miguel", "Isabella", "Valentina", "Lucia",
        "Camila", "Santiago", "Mateo", "Catalina", "Daniela", "Emilia", "Fernanda",
        "Gabriela", "Ines", "Juliana", "Karla", "Lorena", "Mariana", "Natalia",
        "Olivia", "Paula", "Renata", "Silvia", "Tatiana", "Ursula", "Ximena",
        // Indian & South Asian
        "Priya", "Ananya", "Kavya", "Riya", "Anika", "Ishaan", "Arjun", "Dev",
        "Dhruv", "Isha", "Jaya", "Kiara", "Leena", "Maya", "Nisha", "Pooja",
        "Radha", "Sarita", "Tara", "Vani", "Wren", "Yasha",
        // Middle Eastern
        "Farah", "Leila", "Noor", "Rania", "Amal", "Sara", "Yasmin", "Dina",
        "Jenna", "Lina", "Mona", "Rana", "Sana", "Dana", "Hala",
        // Nature & Modern
        "River", "Sage", "Aurora", "Phoenix", "Ember", "Ocean", "Storm", "Meadow",
        "Celeste", "Dawn", "Eden", "Fern", "Gem", "Harbor", "Isle", "Jewel",
        "Lake", "Maple", "Oak", "Pearl", "Quinn", "Reed", "Sierra", "Terra",
        "Vale", "Willow", "Aster", "Bay", "Cedar", "Dale", "Echo", "Flora",
        "Glen", "Heath", "Indigo", "Jasper", "Knox", "Lark", "Moss", "Nash",
        "Onyx", "Piper", "Quest", "Reef", "Slate", "Tide", "Umber", "Vega",
        // Additional diverse names
        "Adele", "Beatrix", "Corinna", "Delphine", "Evangeline", "Fleur", "Geneva",
        "Harriet", "Isadora", "Josephine", "Katherine", "Lavinia", "Marguerite", "Nerissa",
        "Octavia", "Penelope", "Rowena", "Seraphina", "Theodora", "Vivienne",
        "Winifred", "Xanthe", "Yvonne", "Arabella", "Belinda", "Clementine", "Dorothea",
        "Elspeth", "Florence", "Georgiana", "Hildegard", "Imogen", "Jacinda", "Kristina",
        "Leonardo", "Matteo", "Nicolas", "Orlando", "Pascal", "Raphael", "Sebastian",
        "Tobias", "Ulric", "Victor", "Walter", "Xavier", "Yorick", "Zacharias",
    };

    /// <summary>Returns the first name from the pool not already used by any product.</summary>
    public static async Task<string> AssignUniqueNameAsync(AppDbContext context)
    {
        var usedNamesList = await context.Products
            .Where(p => p.Name != null)
            .Select(p => p.Name)
            .ToListAsync();

        var usedNames = usedNamesList.ToHashSet();

        var available = NamePool.FirstOrDefault(n => !usedNames.Contains(n));
        return available ?? $"Product{usedNames.Count + 1}"; // fallback if pool exhausted
    }
}
