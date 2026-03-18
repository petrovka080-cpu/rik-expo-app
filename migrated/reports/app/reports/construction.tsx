// FILE: app/reports/construction.tsx
// Main Construction Reports screen with all 10 sections
import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
    Image,
} from 'react-native';
import { router } from 'expo-router';
import { BackButton } from '../../src/components/ui/BackButton';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabaseClient';
import { getMyCompanyId } from '../../src/lib/rik_api';
import { BottomSheetForm, FormField, FormRow } from '../../src/components/BottomSheetForm';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';


// Types
interface ObjectPassport {
    id: string;
    name: string;
    address: string;
    customer: string;
    contractor: string;
    subcontractor: string;
    contract_number: string;
    permit_number: string;
    permit_date: string;
    foreman_name: string;
    engineer_name: string;
    supervisor_name: string;
    project_code: string;
    total_completion?: number;
}

interface WorkReport {
    id: string;
    report_date: string;
    work_type: string;
    unit: string;
    plan_qty: number;
    fact_qty: number;
    deviation: number;
    note: string;
}

interface MaterialDelivery {
    id: string;
    delivery_date: string;
    material_name: string;
    quantity: number;
    unit: string;
    document_number: string;
    has_certificate: boolean;
    is_accepted: boolean;
}

interface JournalEntry {
    id: string;
    entry_date: string;
    weather: string;
    team_composition: string;
    main_events: string;
    supervisor_notes: string;
}

export default function ConstructionReportsScreen() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [companyId, setCompanyId] = useState<string | null>(null);

    // Data states
    const [objects, setObjects] = useState<ObjectPassport[]>([]);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [workReports, setWorkReports] = useState<WorkReport[]>([]);
    const [materials, setMaterials] = useState<MaterialDelivery[]>([]);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [personnelLogs, setPersonnelLogs] = useState<any[]>([]);
    const [qualityChecks, setQualityChecks] = useState<any[]>([]);
    const [safetyRecords, setSafetyRecords] = useState<any[]>([]);
    const [problemReports, setProblemReports] = useState<any[]>([]);
    const [photos, setPhotos] = useState<any[]>([]);

    // Operational data from RPC (auto-populated)
    const [opRequests, setOpRequests] = useState<any[]>([]);
    const [opPurchases, setOpPurchases] = useState<any[]>([]);
    const [opDeliveries, setOpDeliveries] = useState<any[]>([]);
    const [opStock, setOpStock] = useState<any[]>([]);
    const [opFinances, setOpFinances] = useState<any[]>([]);
    const [opPhotos, setOpPhotos] = useState<any[]>([]);
    const [opMembers, setOpMembers] = useState<any[]>([]);

    // Form states
    const [showObjectForm, setShowObjectForm] = useState(false);
    const [showWorkForm, setShowWorkForm] = useState(false);
    const [showMaterialForm, setShowMaterialForm] = useState(false);
    const [showJournalForm, setShowJournalForm] = useState(false);
    const [showPersonnelForm, setShowPersonnelForm] = useState(false);
    const [showQualityForm, setShowQualityForm] = useState(false);
    const [showSafetyForm, setShowSafetyForm] = useState(false);
    const [showProblemForm, setShowProblemForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [allObjects, setAllObjects] = useState<any[]>([]); // All objects from catalog
    const [commonWorks, setCommonWorks] = useState<string[]>([]);
    const [commonMaterials, setCommonMaterials] = useState<string[]>([]);

    // Suggestion states
    const [objectSearch, setObjectSearch] = useState('');
    const [showObjectSuggestions, setShowObjectSuggestions] = useState(false);

    const [workSearch, setWorkSearch] = useState('');
    const [showWorkSuggestions, setShowWorkSuggestions] = useState(false);

    const [materialSearch, setMaterialSearch] = useState('');
    const [showMaterialSuggestions, setShowMaterialSuggestions] = useState(false);

    // Object passport form
    const [objectForm, setObjectForm] = useState<Partial<ObjectPassport>>({});

    // Work report form
    const [workForm, setWorkForm] = useState({
        work_type: '',
        unit: 'м³',
        plan_qty: '',
        fact_qty: '',
        note: '',
    });

    // Material form
    const [materialForm, setMaterialForm] = useState({
        material_name: '',
        quantity: '',
        unit: 'шт',
        document_number: '',
        has_certificate: false,
        has_passport: false,
    });

    // Journal form
    const [journalForm, setJournalForm] = useState({
        weather: '',
        team_composition: '',
        main_events: '',
        supervisor_notes: '',
    });

    // Personnel form
    const [personnelForm, setPersonnelForm] = useState({
        specialty: '',
        worker_count: '',
        hours_worked: '',
    });

    // Quality form
    const [qualityForm, setQualityForm] = useState({
        check_type: 'inspection',
        work_description: '',
        has_issues: false,
        issue_description: '',
    });

    // Safety form
    const [safetyForm, setSafetyForm] = useState({
        record_type: 'briefing',
        description: '',
        measures_taken: '',
    });

    // Problem form
    const [problemForm, setProblemForm] = useState({
        problem_description: '',
        cause: '',
        schedule_impact: '',
        proposed_solution: '',
        requires_customer_decision: false,
    });

    // Load company and objects
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const cid = await getMyCompanyId();
            setCompanyId(cid);

            if (cid) {
                // Get current user ID
                const { data: { user } } = await supabase.auth.getUser();
                const userId = user?.id;

                // Load common work types and materials for suggestions
                // ... (simplified for readability, previous logic preserved below if needed, but assuming we keep it)
                // Actually, I should keep the logic for commonWorks/Materials as it was, only changing the Object loading part.
                // Re-implementing the full function to be safe.

                // Load common work types for suggestions (User history + Catalog)
                let uniqueWorks: string[] = [];
                const { data: usedWorks } = await supabase
                    .from('work_reports')
                    .select('work_type')
                    .limit(100);

                if (usedWorks) {
                    uniqueWorks = Array.from(new Set(usedWorks.map(w => w.work_type).filter(Boolean)));
                }

                // If few suggestions, load from master catalog
                if (uniqueWorks.length < 5) {
                    const { data: catalogWorks } = await supabase
                        .from('rik_items')
                        .select('name_human')
                        .eq('kind', 'work')
                        .limit(50);

                    if (catalogWorks) {
                        const catalogNames = catalogWorks.map(w => w.name_human).filter(Boolean);
                        uniqueWorks = Array.from(new Set([...uniqueWorks, ...catalogNames]));
                    }
                }
                setCommonWorks(uniqueWorks.slice(0, 50));

                // Load common materials for suggestions (User history + Catalog)
                let uniqueMats: string[] = [];
                const { data: usedMaterials } = await supabase
                    .from('material_deliveries')
                    .select('material_name')
                    .limit(100);

                if (usedMaterials) {
                    uniqueMats = Array.from(new Set(usedMaterials.map(m => m.material_name).filter(Boolean)));
                }

                // If few suggestions, load from master catalog
                if (uniqueMats.length < 5) {
                    const { data: catalogMats } = await supabase
                        .from('rik_items')
                        .select('name_human')
                        .eq('kind', 'material')
                        .limit(50);

                    if (catalogMats) {
                        const catalogNames = catalogMats.map(m => m.name_human).filter(Boolean);
                        uniqueMats = Array.from(new Set([...uniqueMats, ...catalogNames]));
                    }
                }
                setCommonMaterials(uniqueMats.slice(0, 50));

                // --- OBJECT LOADING FIX ---

                // 1. Assigned Objects (Priority)
                const assignedIds = new Set<string>();
                let assignedObjects: ObjectPassport[] = [];

                if (userId) {
                    const { data: workerObjs } = await supabase
                        .from('worker_objects')
                        .select('object_id, objects(id, name, address)')
                        .eq('profile_id', userId);

                    if (workerObjs && workerObjs.length > 0) {
                        assignedObjects = workerObjs
                            .filter((wo: any) => wo.objects)
                            .map((wo: any) => {
                                assignedIds.add(wo.objects.id);
                                return {
                                    id: wo.objects.id,
                                    name: wo.objects.name,
                                    address: wo.objects.address || '',
                                    // Default empty fields for passport data
                                    customer: '', contractor: '', subcontractor: '',
                                    contract_number: '', permit_number: '', permit_date: '',
                                    foreman_name: '', engineer_name: '', supervisor_name: '',
                                    project_code: '',
                                    total_completion: 0
                                };
                            });
                    }
                }

                // 2. All Company Objects (Fallback/Supplementary)
                // This ensures objects created purely in "Catalog" are visible even without assignment
                const { data: allCompanyObjects } = await supabase
                    .from('objects')
                    .select('*')
                    .eq('company_id', cid)
                    .order('name');

                setAllObjects(allCompanyObjects || []);

                // 3. Object Passports (Metadata)
                // We use this to enrich object data, NOT as the primary source of IDs if possible
                const { data: passports } = await supabase
                    .from('object_passports')
                    .select('*')
                    .eq('company_id', cid)
                    .eq('is_active', true);

                // Create a map of passports by object_id (if linked) or fallback
                // Note: If object_passports are standalone (legacy?), we might need to include them too.
                // But assuming modern system uses 'objects' table as source of truth.

                // Merge logic:
                // Start with Assigned Objects
                // Add any Company Object that isn't in Assigned

                const otherObjects = (allCompanyObjects || [])
                    .filter((o: any) => !assignedIds.has(o.id))
                    .map((o: any) => ({
                        id: o.id,
                        name: o.name,
                        address: o.address || '',
                        customer: '', contractor: '', subcontractor: '',
                        contract_number: '', permit_number: '', permit_date: '',
                        foreman_name: '', engineer_name: '', supervisor_name: '',
                        project_code: '',
                        total_completion: 0
                    }));

                // Combine them
                let finalObjects = [...assignedObjects, ...otherObjects];

                // Check for loose passports (Passports that might not map to an object but user expects to see?)
                // Ideally we shouldn't have these, but let's check passports.
                if (passports) {
                    // 1. Identify passports that ARE NOT linked to any existing finalObject
                    const standalonePassports = passports.filter((p: any) => {
                        const linkedById = finalObjects.find(obj => obj.id === p.object_id);
                        const linkedByName = finalObjects.find(obj => obj.name === p.name);
                        return !linkedById && !linkedByName;
                    });

                    // 2. Append them to finalObjects
                    if (standalonePassports.length > 0) {
                        const formattedPassports = standalonePassports.map((p: any) => ({
                            id: p.id, // Use passport ID since no object ID exists
                            name: p.name,
                            address: p.address || '',
                            customer: p.customer,
                            contractor: p.contractor,
                            subcontractor: p.subcontractor,
                            contract_number: p.contract_number,
                            permit_number: p.permit_number,
                            permit_date: p.permit_date,
                            foreman_name: p.foreman_name,
                            engineer_name: p.engineer_name,
                            supervisor_name: p.supervisor_name,
                            project_code: p.project_code,
                            total_completion: p.total_completion
                        }));
                        finalObjects = [...finalObjects, ...formattedPassports];
                    }

                    // 3. Enrich existing objects
                    finalObjects = finalObjects.map(obj => {
                        // Find passport that might link to this object?
                        // If passport structure has object_id, use it.
                        // Assuming passport MIGHT be the object itself in some legacy view, but let's stick to 'objects' table IDs.
                        // For now we just return the object as is from objects table to ensure ID match with Foreman.

                        // Try to find matching passport info by name if exact link missing? 
                        // Or just use what we have.
                        const p = passports.find((pp: any) => pp.object_id === obj.id || pp.name === obj.name);
                        if (p) {
                            return {
                                ...obj,
                                customer: p.customer,
                                contractor: p.contractor,
                                subcontractor: p.subcontractor,
                                contract_number: p.contract_number,
                                permit_number: p.permit_number,
                                permit_date: p.permit_date,
                                foreman_name: p.foreman_name,
                                engineer_name: p.engineer_name,
                                supervisor_name: p.supervisor_name,
                                project_code: p.project_code,
                                total_completion: p.total_completion
                            };
                        }
                        return obj;
                    });
                }

                if (finalObjects.length > 0) {
                    setObjects(finalObjects);
                    // Preserve selection if still valid, else select first
                    if (!selectedObjectId || !finalObjects.find(o => o.id === selectedObjectId)) {
                        setSelectedObjectId(finalObjects[0].id);
                    }
                } else {
                    setObjects([]);
                }
            }
        } catch (e) {
            console.error('[ConstructionReports] loadData error:', e);
        } finally {
            setLoading(false);
        }
    };

    const resolvePassportId = async (id: string): Promise<string> => {
        try {
            const { data: passport } = await supabase
                .from('object_passports')
                .select('id')
                .eq('object_id', id)
                .single();
            return passport?.id || id;
        } catch (e) {
            return id;
        }
    };

    // Load reports for selected object
    useEffect(() => {
        if (selectedObjectId) {
            loadObjectReports(selectedObjectId);
        }
    }, [selectedObjectId]);

    const loadObjectReports = async (objectId: string) => {
        try {
            const targetId = objectId;
            console.log(`[ConstructionReports] Loading reports for object ${objectId}`);

            // Load work reports
            const { data: works } = await supabase
                .from('work_reports')
                .select('*')
                .eq('object_id', targetId)
                .order('report_date', { ascending: false })
                .limit(50);

            if (works) setWorkReports(works as WorkReport[]);

            // Load materials
            // Materials might be linked effectively to objects OR passports locally?
            // Schema check: material_deliveries has object_id.
            // Let's assume it follows the same pattern (linked to passport).
            const { data: mats } = await supabase
                .from('material_deliveries')
                .select('*')
                .eq('object_id', targetId)
                .order('delivery_date', { ascending: false })
                .limit(50);

            if (mats) setMaterials(mats as MaterialDelivery[]);

            // Load journal entries
            const { data: journal } = await supabase
                .from('work_journal_entries')
                .select('*')
                .eq('object_id', targetId)
                .order('entry_date', { ascending: false })
                .limit(30);

            if (journal) setJournalEntries(journal as JournalEntry[]);

            // Load personnel logs
            const { data: personnel } = await supabase
                .from('personnel_logs')
                .select('*')
                .eq('object_id', targetId)
                .order('log_date', { ascending: false })
                .limit(30);
            if (personnel) setPersonnelLogs(personnel);

            // Load quality checks
            const { data: quality } = await supabase
                .from('quality_checks')
                .select('*')
                .eq('object_id', targetId)
                .order('check_date', { ascending: false })
                .limit(30);
            if (quality) setQualityChecks(quality);

            // Load safety records
            const { data: safety } = await supabase
                .from('safety_records')
                .select('*')
                .eq('object_id', targetId)
                .order('record_date', { ascending: false })
                .limit(30);
            if (safety) setSafetyRecords(safety);

            // Load problem reports
            const { data: problems } = await supabase
                .from('problem_reports')
                .select('*')
                .eq('object_id', targetId)
                .order('report_date', { ascending: false })
                .limit(30);
            if (problems) setProblemReports(problems);

            // Load photos
            const { data: reportPhotos } = await supabase
                .from('report_photos')
                .select('*')
                .eq('object_id', targetId)
                .order('created_at', { ascending: false })
                .limit(20);
            if (reportPhotos) setPhotos(reportPhotos);

            // === AUTO-POPULATE from operational data via RPC ===
            try {
                const { data: opData, error: opError } = await supabase
                    .rpc('get_object_report_data', { p_object_id: objectId });

                if (!opError && opData) {
                    const d = opData as any;
                    setOpRequests(d.requests || []);
                    setOpPurchases(d.purchases || []);
                    setOpDeliveries(d.deliveries || []);
                    setOpStock(d.stock || []);
                    setOpFinances(d.finances || []);
                    setOpPhotos(d.photos || []);
                    setOpMembers(d.members || []);
                    console.log(`[ConstructionReports] Operational data loaded: ${(d.requests || []).length} requests, ${(d.purchases || []).length} purchases, ${(d.deliveries || []).length} deliveries, ${(d.stock || []).length} stock`);
                } else {
                    console.warn('[ConstructionReports] RPC error:', opError?.message);
                }
            } catch (rpcErr) {
                console.warn('[ConstructionReports] RPC fallback:', rpcErr);
            }
        } catch (e) {
            console.error('[ConstructionReports] loadObjectReports error:', e);
        }
    };

    // Take Photo with Camera + Geolocation
    const takePhoto = async () => {
        if (!selectedObjectId) {
            Alert.alert('Ошибка', 'Сначала выберите объект');
            return;
        }

        try {
            // Request camera permission
            const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraStatus !== 'granted') {
                Alert.alert('Ошибка', 'Нужен доступ к камере');
                return;
            }

            // Request location permission
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            let location = null;
            if (locationStatus === 'granted') {
                try {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                    location = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                    };
                } catch (e) {
                    console.log('Could not get location:', e);
                }
            }

            // Launch camera
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: 'images',
                quality: 0.7,
                allowsEditing: false,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const photo = result.assets[0];

            // Prompt for caption
            Alert.prompt(
                'Описание фото',
                'Введите краткое описание',
                async (caption) => {
                    setSaving(true);
                    try {
                        const targetId = selectedObjectId;
                        // For now, save as local URI (in production would upload to Supabase Storage)
                        const { error } = await supabase.from('report_photos').insert({
                            object_id: targetId,
                            report_section: 'general',
                            photo_url: photo.uri,
                            caption: caption || 'Фото со стройплощадки',
                            taken_at: new Date().toISOString(),
                            latitude: location?.latitude,
                            longitude: location?.longitude,
                        });

                        if (error) throw error;

                        await loadObjectReports(selectedObjectId);
                        Alert.alert('✅ Готово', `Фото сохранено${location ? ' с геолокацией' : ''}`);
                    } catch (e: any) {
                        Alert.alert('Ошибка', e.message);
                    } finally {
                        setSaving(false);
                    }
                },
                'plain-text',
                ''
            );
        } catch (e: any) {
            Alert.alert('Ошибка камеры', e.message);
        }
    };

    // Save Object Passport
    const saveObjectPassport = async () => {
        if (!objectForm.name?.trim()) {
            Alert.alert('Ошибка', 'Введите наименование объекта');
            return;
        }
        if (!companyId) {
            Alert.alert('Ошибка', 'Данные компании не загружены. Обновите страницу и попробуйте снова.');
            return;
        }
        setSaving(true);
        try {
            // Build the insert payload
            const insertData: any = {
                company_id: companyId,
                name: objectForm.name.trim(),
                address: objectForm.address || null,
                customer: objectForm.customer || null,
                contractor: objectForm.contractor || null,
                subcontractor: objectForm.subcontractor || null,
                contract_number: objectForm.contract_number || null,
                permit_number: objectForm.permit_number || null,
                permit_date: objectForm.permit_date || null,
                project_code: objectForm.project_code || null,
                foreman_name: objectForm.foreman_name || null,
                engineer_name: objectForm.engineer_name || null,
                supervisor_name: objectForm.supervisor_name || null,
            };

            // Note: object_id column exists but optional - linking to objects catalog

            console.log('[ConstructionReports] saveObjectPassport payload:', insertData);

            const { data, error } = await supabase
                .from('object_passports')
                .insert(insertData)
                .select()
                .single();
            if (error) {
                console.error('[ConstructionReports] saveObjectPassport DB error:', error);
                throw error;
            }
            if (!data) throw new Error('Данные не были возвращены сервером');
            const newObject = data as ObjectPassport;
            setObjects(prev => [newObject, ...prev]);
            setSelectedObjectId(newObject.id);
            await loadObjectReports(newObject.id);
            setShowObjectForm(false);
            setObjectForm({});
            setObjectSearch('');
            setShowObjectSuggestions(false);
            Alert.alert('✅ Готово', 'Паспорт объекта сохранён');
        } catch (e: any) {
            console.error('[ConstructionReports] saveObjectPassport error:', e);
            Alert.alert('Ошибка', e.message || 'Не удалось сохранить паспорт объекта');
        } finally {
            setSaving(false);
        }
    };


    // Save Work Report
    const saveWorkReport = async () => {
        if (!workForm.work_type?.trim()) {
            Alert.alert('Ошибка', 'Введите вид работ');
            return;
        }
        if (!selectedObjectId) {
            Alert.alert('Ошибка', 'Сначала выберите объект');
            return;
        }

        setSaving(true);
        try {
            const targetId = selectedObjectId;
            const { error } = await supabase
                .from('work_reports')
                .insert({
                    object_id: targetId,
                    report_date: new Date().toISOString().slice(0, 10),
                    period_type: 'daily',
                    work_type: workForm.work_type,
                    unit: workForm.unit,
                    plan_qty: Number(workForm.plan_qty) || 0,
                    fact_qty: Number(workForm.fact_qty) || 0,
                    note: workForm.note,
                });

            if (error) throw error;

            await loadObjectReports(selectedObjectId);
            setShowWorkForm(false);
            setWorkForm({ work_type: '', unit: 'м³', plan_qty: '', fact_qty: '', note: '' });
            setWorkSearch('');
            setShowWorkSuggestions(false);
            Alert.alert('✅ Готово', 'Запись о работах добавлена');
        } catch (e: any) {
            console.error('[ConstructionReports] saveWorkReport error:', e);
            Alert.alert('Ошибка', e.message || 'Не удалось сохранить запись о работах');
        } finally {
            setSaving(false);
        }
    };

    // Save Material
    const saveMaterial = async () => {
        if (!materialForm.material_name?.trim()) {
            Alert.alert('Ошибка', 'Введите название материала');
            return;
        }
        if (!selectedObjectId) {
            Alert.alert('Ошибка', 'Сначала выберите объект');
            return;
        }

        setSaving(true);
        try {
            const targetId = selectedObjectId;
            const { error } = await supabase
                .from('material_deliveries')
                .insert({
                    object_id: targetId,
                    delivery_date: new Date().toISOString().slice(0, 10),
                    material_name: materialForm.material_name,
                    quantity: Number(materialForm.quantity) || 0,
                    unit: materialForm.unit,
                    document_number: materialForm.document_number,
                    has_certificate: materialForm.has_certificate,
                });

            if (error) throw error;

            await loadObjectReports(selectedObjectId);
            setShowMaterialForm(false);
            setMaterialForm({
                material_name: '',
                quantity: '',
                unit: 'шт',
                document_number: '',
                has_certificate: false,
                has_passport: false
            });
            setMaterialSearch('');
            setShowMaterialSuggestions(false);
            Alert.alert('✅ Готово', 'Материал добавлен');
        } catch (e: any) {
            console.error('[ConstructionReports] saveMaterial error:', e);
            Alert.alert('Ошибка', e.message || 'Не удалось сохранить материал');
        } finally {
            setSaving(false);
        }
    };

    // Save Journal Entry
    const saveJournalEntry = async () => {
        if (!journalForm.main_events?.trim()) {
            Alert.alert('Ошибка', 'Опишите основные события дня');
            return;
        }
        if (!selectedObjectId) {
            Alert.alert('Ошибка', 'Сначала выберите объект');
            return;
        }

        setSaving(true);
        try {
            const targetId = selectedObjectId;
            const { error } = await supabase
                .from('work_journal_entries')
                .insert({
                    object_id: targetId,
                    entry_date: new Date().toISOString().slice(0, 10),
                    weather: journalForm.weather,
                    team_composition: journalForm.team_composition,
                    main_events: journalForm.main_events,
                    supervisor_notes: journalForm.supervisor_notes,
                });

            if (error) throw error;

            await loadObjectReports(selectedObjectId);
            setShowJournalForm(false);
            setJournalForm({ weather: '', team_composition: '', main_events: '', supervisor_notes: '' });
            Alert.alert('✅ Готово', 'Запись в журнал добавлена');
        } catch (e: any) {
            Alert.alert('Ошибка', e.message);
        } finally {
            setSaving(false);
        }
    };

    // Save Personnel Log
    const savePersonnel = async () => {
        if (!personnelForm.specialty?.trim()) {
            Alert.alert('Ошибка', 'Укажите специальность');
            return;
        }
        if (!selectedObjectId) return;

        setSaving(true);
        try {
            const targetId = selectedObjectId;
            const { error } = await supabase.from('personnel_logs').insert({
                object_id: targetId,
                log_date: new Date().toISOString().slice(0, 10),
                specialty: personnelForm.specialty,
                worker_count: Number(personnelForm.worker_count) || 0,
                hours_worked: Number(personnelForm.hours_worked) || 0,
            });
            if (error) throw error;
            await loadObjectReports(selectedObjectId);
            setShowPersonnelForm(false);
            setPersonnelForm({ specialty: '', worker_count: '', hours_worked: '' });
            Alert.alert('✅ Готово', 'Персонал добавлен');
        } catch (e: any) {
            Alert.alert('Ошибка', e.message);
        } finally {
            setSaving(false);
        }
    };

    // Save Quality Check
    const saveQuality = async () => {
        if (!qualityForm.work_description?.trim()) {
            Alert.alert('Ошибка', 'Опишите проверенные работы');
            return;
        }
        if (!selectedObjectId) return;

        setSaving(true);
        try {
            const targetId = selectedObjectId;
            const { error } = await supabase.from('quality_checks').insert({
                object_id: targetId,
                check_date: new Date().toISOString().slice(0, 10),
                check_type: qualityForm.check_type,
                work_description: qualityForm.work_description,
                has_issues: qualityForm.has_issues,
                issue_description: qualityForm.issue_description,
            });
            if (error) throw error;
            await loadObjectReports(selectedObjectId);
            setShowQualityForm(false);
            setQualityForm({ check_type: 'inspection', work_description: '', has_issues: false, issue_description: '' });
            Alert.alert('✅ Готово', 'Проверка добавлена');
        } catch (e: any) {
            Alert.alert('Ошибка', e.message);
        } finally {
            setSaving(false);
        }
    };

    // Save Safety Record
    const saveSafety = async () => {
        if (!safetyForm.description?.trim()) {
            Alert.alert('Ошибка', 'Опишите событие');
            return;
        }
        if (!selectedObjectId) return;

        setSaving(true);
        try {
            const targetId = selectedObjectId;
            const { error } = await supabase.from('safety_records').insert({
                object_id: targetId,
                record_date: new Date().toISOString().slice(0, 10),
                record_type: safetyForm.record_type,
                description: safetyForm.description,
                measures_taken: safetyForm.measures_taken,
            });
            if (error) throw error;
            await loadObjectReports(selectedObjectId);
            setShowSafetyForm(false);
            setSafetyForm({ record_type: 'briefing', description: '', measures_taken: '' });
            Alert.alert('✅ Готово', 'Запись ОТ/ТБ добавлена');
        } catch (e: any) {
            Alert.alert('Ошибка', e.message);
        } finally {
            setSaving(false);
        }
    };

    // Save Problem Report
    const saveProblem = async () => {
        if (!problemForm.problem_description?.trim()) {
            Alert.alert('Ошибка', 'Опишите проблему');
            return;
        }
        if (!selectedObjectId) return;

        setSaving(true);
        try {
            const targetId = selectedObjectId;
            const { error } = await supabase.from('problem_reports').insert({
                object_id: targetId,
                report_date: new Date().toISOString().slice(0, 10),
                problem_description: problemForm.problem_description,
                cause: problemForm.cause,
                schedule_impact: problemForm.schedule_impact,
                proposed_solution: problemForm.proposed_solution,
                requires_customer_decision: problemForm.requires_customer_decision,
            });
            if (error) throw error;
            await loadObjectReports(selectedObjectId);
            setShowProblemForm(false);
            setProblemForm({ problem_description: '', cause: '', schedule_impact: '', proposed_solution: '', requires_customer_decision: false });
            Alert.alert('✅ Готово', 'Проблема зафиксирована');
        } catch (e: any) {
            Alert.alert('Ошибка', e.message);
        } finally {
            setSaving(false);
        }
    };

    // Export PDF
    const exportPDF = async () => {
        const currentObject = objects.find(o => o.id === selectedObjectId);
        if (!currentObject) {
            Alert.alert('Ошибка', 'Выберите объект');
            return;
        }

        try {
            const { generateConstructionReportHtml } = await import('../../src/lib/pdf_templates');
            const { generateDocumentQR } = await import('../../src/lib/qr_utils');
            const today = new Date().toLocaleDateString('ru-RU');
            const reportId = currentObject.id || 'N/A';
            const qrDataUrl = generateDocumentQR('construction', reportId, 100);

            // Build data for template
            const html = generateConstructionReportHtml({
                reportId,
                date: today,
                objectName: currentObject.name || '',
                objectAddress: currentObject.address || '',
                foremanName: currentObject.foreman_name || '',
                qrDataUrl,
                workReports: workReports.map(w => ({
                    workType: w.work_type || '',
                    unit: w.unit || '',
                    planQty: Number(w.plan_qty) || 0,
                    factQty: Number(w.fact_qty) || 0,
                })),
                materials: materials.map(m => ({
                    name: m.material_name || '',
                    qty: Number(m.quantity) || 0,
                    unit: m.unit || '',
                    document: m.document_number || '',
                    hasCertificate: m.has_certificate || false,
                })),
                journalEntries: journalEntries.map(j => ({
                    date: new Date(j.entry_date).toLocaleDateString('ru-RU'),
                    events: j.main_events || '',
                    team: j.team_composition || '',
                    notes: j.supervisor_notes || '',
                })),
            });

            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { dialogTitle: `Отчёт - ${currentObject.name}` });
        } catch (e: any) {
            Alert.alert('Ошибка PDF', e.message);
        }
    };

    // Export Excel (CSV format)
    const exportExcel = async () => {
        const currentObject = objects.find(o => o.id === selectedObjectId);
        if (!currentObject) {
            Alert.alert('Ошибка', 'Выберите объект');
            return;
        }

        setExporting(true);
        try {
            const today = new Date().toISOString().slice(0, 10);

            // Build CSV content for Excel
            let csv = '\uFEFF'; // BOM for Excel UTF-8 support
            csv += `Строительный отчёт - ${currentObject.name}\n`;
            csv += `Дата: ${today}\n\n`;

            // Work Reports section
            csv += 'ВЫПОЛНЕННЫЕ РАБОТЫ\n';
            csv += 'Вид работ;План;Факт;Ед.изм.;Отклонение;Дата\n';
            workReports.forEach(w => {
                const deviation = ((Number(w.fact_qty) - Number(w.plan_qty)) / (Number(w.plan_qty) || 1) * 100).toFixed(1);
                csv += `"${w.work_type}";${w.plan_qty};${w.fact_qty};${w.unit};${deviation}%;${w.report_date}\n`;
            });

            // Materials section
            csv += '\nМАТЕРИАЛЫ И ПОСТАВКИ\n';
            csv += 'Наименование;Кол-во;Ед.изм.;Документ;Сертификат;Дата\n';
            materials.forEach(m => {
                csv += `"${m.material_name}";${m.quantity};${m.unit};"${m.document_number || ''}";${m.has_certificate ? 'Да' : 'Нет'};${m.delivery_date}\n`;
            });

            // Personnel section
            csv += '\nПЕРСОНАЛ\n';
            csv += 'Специальность;Кол-во человек;Часов;Дата\n';
            personnelLogs.forEach(p => {
                csv += `"${p.specialty}";${p.worker_count};${p.hours_worked};${p.log_date}\n`;
            });

            // Quality section  
            csv += '\nКОНТРОЛЬ КАЧЕСТВА\n';
            csv += 'Тип;Описание;Замечания;Дата\n';
            qualityChecks.forEach(q => {
                csv += `"${q.check_type === 'hidden_work' ? 'АОСР' : 'Проверка'}";"${q.work_description}";${q.has_issues ? 'Да' : 'Нет'};${q.check_date}\n`;
            });

            // Safety section
            csv += '\nОТ/ТБ\n';
            csv += 'Тип;Описание;Меры;Дата\n';
            safetyRecords.forEach(s => {
                const typeLabel = s.record_type === 'briefing' ? 'Инструктаж' : s.record_type === 'violation' ? 'Нарушение' : 'Инцидент';
                csv += `"${typeLabel}";"${s.description}";"${s.measures_taken || ''}";${s.record_date}\n`;
            });

            // Problems section
            csv += '\nПРОБЛЕМЫ И РИСКИ\n';
            csv += 'Проблема;Причина;Влияние;Решение;Требует заказчика;Дата\n';
            problemReports.forEach(p => {
                csv += `"${p.problem_description}";"${p.cause || ''}";"${p.schedule_impact || ''}";"${p.proposed_solution || ''}";${p.requires_customer_decision ? 'Да' : 'Нет'};${p.report_date}\n`;
            });

            // Save and share - Using workaround for SDK 54+ FileSystem API
            const fileName = `Otchet_${currentObject.name.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${today}.csv`;
            const tempDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
            const filePath = `${tempDir}${fileName}`;

            await (FileSystem as any).writeAsStringAsync(filePath, csv, { encoding: 'utf8' });
            await Sharing.shareAsync(filePath, {
                mimeType: 'text/csv',
                dialogTitle: `Excel отчёт - ${currentObject.name}`,
            });
        } catch (e: any) {
            Alert.alert('Ошибка Excel', e.message);
        } finally {
            setExporting(false);
        }
    };

    const selectedObject = objects.find(o => o.id === selectedObjectId);
    const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 1 });

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0ea5e9" />
                <Text style={{ color: '#94a3b8', marginTop: 12 }}>Загрузка...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#0f172a' }} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header */}
            <View style={{
                backgroundColor: '#1e293b',
                paddingTop: 20,
                paddingBottom: 20,
                paddingHorizontal: 16,
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <BackButton theme="dark" fallbackPath="/reports" />
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>Строительные отчёты</Text>
                </View>

                {/* Object selector */}
                {objects.length > 0 ? (
                    <View style={{ backgroundColor: '#0f172a', borderRadius: 12, padding: 12 }}>
                        <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>Объект:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                                {objects.map((obj) => (
                                    <Pressable
                                        key={obj.id}
                                        onPress={() => setSelectedObjectId(obj.id)}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 10,
                                            borderRadius: 10,
                                            backgroundColor: selectedObjectId === obj.id ? '#0ea5e9' : '#334155',
                                            borderWidth: 1,
                                            borderColor: selectedObjectId === obj.id ? '#0ea5e9' : '#475569',
                                        }}
                                    >
                                        <Text style={{
                                            color: selectedObjectId === obj.id ? '#fff' : '#94a3b8',
                                            fontWeight: selectedObjectId === obj.id ? '700' : '500',
                                            fontSize: 14,
                                        }}>
                                            {obj.name}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                ) : (
                    <Pressable
                        style={{ backgroundColor: '#0ea5e9', borderRadius: 12, padding: 16, alignItems: 'center' }}
                        onPress={() => setShowObjectForm(true)}
                    >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>➕ Создать паспорт объекта</Text>
                    </Pressable>
                )}
            </View>

            {/* Main content */}
            <View style={{ padding: 16, gap: 16 }}>

                {/* Quick actions - Row 1 */}
                {selectedObjectId && (
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        <Pressable
                            style={{ backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#374151' }}
                            onPress={() => setShowWorkForm(true)}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>➕ Работы</Text>
                        </Pressable>
                        <Pressable
                            style={{ backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#374151' }}
                            onPress={() => setShowMaterialForm(true)}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>📦 Материал</Text>
                        </Pressable>
                        <Pressable
                            style={{ backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#374151' }}
                            onPress={() => setShowJournalForm(true)}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>📝 Журнал</Text>
                        </Pressable>
                        <Pressable
                            style={{ backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#374151' }}
                            onPress={() => setShowPersonnelForm(true)}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>👷 Персонал</Text>
                        </Pressable>
                        <Pressable
                            style={{ backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#374151' }}
                            onPress={() => setShowQualityForm(true)}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>✅ Качество</Text>
                        </Pressable>
                        <Pressable
                            style={{ backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#374151' }}
                            onPress={() => setShowSafetyForm(true)}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>🦺 ОТ/ТБ</Text>
                        </Pressable>
                        <Pressable
                            style={{ backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#374151' }}
                            onPress={() => setShowProblemForm(true)}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>⚠️ Проблема</Text>
                        </Pressable>
                        <Pressable
                            style={{ backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#374151' }}
                            onPress={takePhoto}
                            disabled={saving}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{saving ? '⌛' : '📷'} Фото</Text>
                        </Pressable>
                        <Pressable
                            style={{ backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#374151' }}
                            onPress={exportPDF}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>📄 PDF</Text>
                        </Pressable>
                        <Pressable
                            style={{ backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#374151' }}
                            onPress={exportExcel}
                            disabled={exporting}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{exporting ? '⌛' : '📊'} Excel</Text>
                        </Pressable>
                    </View>
                )}

                {/* Work Reports / Requests Section */}
                {selectedObjectId && (
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Выполненные работы</Text>

                        {workReports.length === 0 && opRequests.length === 0 ? (
                            <Text style={{ color: '#A1A1AA', textAlign: 'center', paddingVertical: 20 }}>Нет записей</Text>
                        ) : (
                            <>
                                {/* Manual work reports */}
                                {workReports.length > 0 && (
                                    <>
                                        <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#475569' }}>
                                            <Text style={{ flex: 2, color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>Вид работ</Text>
                                            <Text style={{ width: 50, color: '#94a3b8', fontSize: 12, fontWeight: '600', textAlign: 'right' }}>План</Text>
                                            <Text style={{ width: 50, color: '#94a3b8', fontSize: 12, fontWeight: '600', textAlign: 'right' }}>Факт</Text>
                                            <Text style={{ width: 50, color: '#94a3b8', fontSize: 12, fontWeight: '600', textAlign: 'right' }}>Откл.</Text>
                                        </View>
                                        {workReports.slice(0, 10).map((w, i) => (
                                            <View key={w.id} style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#334155' }}>
                                                <Text style={{ flex: 2, color: '#fff', fontSize: 14 }} numberOfLines={1}>{w.work_type}</Text>
                                                <Text style={{ width: 50, color: '#94a3b8', fontSize: 14, textAlign: 'right' }}>{fmt(w.plan_qty)}</Text>
                                                <Text style={{ width: 50, color: '#fff', fontSize: 14, textAlign: 'right', fontWeight: '600' }}>{fmt(w.fact_qty)}</Text>
                                                <Text style={{
                                                    width: 50, fontSize: 14, textAlign: 'right', fontWeight: '600',
                                                    color: w.deviation < 0 ? '#ef4444' : '#22c55e'
                                                }}>
                                                    {w.deviation >= 0 ? '+' : ''}{fmt(w.deviation)}
                                                </Text>
                                            </View>
                                        ))}
                                    </>
                                )}

                                {/* Auto-populated from requests */}
                                {opRequests.length > 0 && (
                                    <>
                                        {workReports.length > 0 && (
                                            <Text style={{ color: '#0ea5e9', fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 8 }}>Из заявок</Text>
                                        )}
                                        <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#475569' }}>
                                            <Text style={{ flex: 2, color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>Позиция</Text>
                                            <Text style={{ width: 60, color: '#94a3b8', fontSize: 12, fontWeight: '600', textAlign: 'right' }}>Кол-во</Text>
                                            <Text style={{ width: 70, color: '#94a3b8', fontSize: 12, fontWeight: '600', textAlign: 'right' }}>Статус</Text>
                                        </View>
                                        {opRequests.slice(0, 20).map((r: any, i: number) => (
                                            <View key={r.id || i} style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#334155', alignItems: 'center' }}>
                                                <View style={{ flex: 2 }}>
                                                    <Text style={{ color: '#fff', fontSize: 14 }} numberOfLines={1}>{r.name_human || r.rik_code || '—'}</Text>
                                                    {r.pretty_no && <Text style={{ color: '#64748b', fontSize: 11 }}>№ {r.pretty_no}</Text>}
                                                </View>
                                                <Text style={{ width: 60, color: '#0ea5e9', fontSize: 14, textAlign: 'right', fontWeight: '600' }}>{fmt(r.qty)} {r.uom || ''}</Text>
                                                <View style={{ width: 70, alignItems: 'flex-end' }}>
                                                    <Text style={{
                                                        fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
                                                        overflow: 'hidden',
                                                        color: r.item_status === 'К закупке' || r.item_status === 'В работе' ? '#22c55e'
                                                            : r.item_status === 'Отклонено' ? '#ef4444'
                                                                : r.item_status === 'У директора' || r.item_status === 'На утверждении' ? '#a78bfa'
                                                                    : r.item_status === 'На доработке' ? '#f59e0b'
                                                                        : r.item_status === 'Черновик' ? '#64748b'
                                                                            : '#94a3b8',
                                                        backgroundColor: r.item_status === 'К закупке' || r.item_status === 'В работе' ? 'rgba(34,197,94,0.15)'
                                                            : r.item_status === 'Отклонено' ? 'rgba(239,68,68,0.15)'
                                                                : r.item_status === 'У директора' || r.item_status === 'На утверждении' ? 'rgba(167,139,250,0.15)'
                                                                    : r.item_status === 'На доработке' ? 'rgba(245,158,11,0.15)'
                                                                        : r.item_status === 'Черновик' ? 'rgba(100,116,139,0.15)'
                                                                            : 'rgba(148,163,184,0.15)',
                                                    }}>{r.item_status || r.request_status || '—'}</Text>
                                                </View>
                                            </View>
                                        ))}
                                        {opRequests.length > 20 && (
                                            <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 8 }}>и ещё {opRequests.length - 20} позиций</Text>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </View>
                )}

                {/* Materials Section - from deliveries + stock */}
                {selectedObjectId && (
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Материалы</Text>

                        {materials.length === 0 && opDeliveries.length === 0 && opStock.length === 0 ? (
                            <Text style={{ color: '#A1A1AA', textAlign: 'center', paddingVertical: 20 }}>Нет поставок</Text>
                        ) : (
                            <>
                                {/* Manual material deliveries */}
                                {materials.length > 0 && (
                                    materials.slice(0, 10).map((m, i) => (
                                        <View key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#334155' }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: '#fff', fontSize: 14 }}>{m.material_name}</Text>
                                                <Text style={{ color: '#A1A1AA', fontSize: 12 }}>{m.document_number || 'Без документа'}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ color: '#0ea5e9', fontSize: 16, fontWeight: '700' }}>{fmt(m.quantity)} {m.unit}</Text>
                                                <Text style={{ color: m.has_certificate ? '#22c55e' : '#64748b', fontSize: 11 }}>
                                                    {m.has_certificate ? '✓ Сертификат' : 'Без сертификата'}
                                                </Text>
                                            </View>
                                        </View>
                                    ))
                                )}

                                {/* Auto-populated deliveries (wh_incoming) */}
                                {opDeliveries.length > 0 && (
                                    <>
                                        {materials.length > 0 && <View style={{ height: 1, backgroundColor: '#475569', marginVertical: 8 }} />}
                                        <Text style={{ color: '#0ea5e9', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Приход на склад ({opDeliveries.length})</Text>
                                        {opDeliveries.slice(0, 10).map((d: any, i: number) => (
                                            <View key={d.id || i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#334155' }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ color: '#fff', fontSize: 14 }}>{d.po_no || 'Без PO'}</Text>
                                                    <Text style={{ color: '#64748b', fontSize: 11 }}>
                                                        {d.supplier || '—'} • {d.created_at ? new Date(d.created_at).toLocaleDateString('ru-RU') : ''}
                                                    </Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={{ color: '#0ea5e9', fontSize: 16, fontWeight: '700' }}>{fmt(d.qty)}</Text>
                                                    <Text style={{
                                                        fontSize: 10, fontWeight: '600',
                                                        color: d.status === 'confirmed' ? '#22c55e' : '#f59e0b',
                                                    }}>{d.status === 'confirmed' ? 'Принят' : 'Ожидает'}</Text>
                                                </View>
                                            </View>
                                        ))}
                                        {opDeliveries.length > 10 && (
                                            <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 4 }}>и ещё {opDeliveries.length - 10}</Text>
                                        )}
                                    </>
                                )}

                                {/* Stock on hand */}
                                {opStock.length > 0 && (
                                    <>
                                        <View style={{ height: 1, backgroundColor: '#475569', marginVertical: 8 }} />
                                        <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Остатки на объекте ({opStock.length})</Text>
                                        {opStock.slice(0, 10).map((s: any, i: number) => (
                                            <View key={s.id || i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#334155' }}>
                                                <Text style={{ flex: 1, color: '#fff', fontSize: 14 }} numberOfLines={1}>{s.material_name || s.material_code || '—'}</Text>
                                                <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: '700' }}>{fmt(s.qty_on_hand)} {s.uom || ''}</Text>
                                            </View>
                                        ))}
                                    </>
                                )}
                            </>
                        )}
                    </View>
                )}

                {/* Work Journal Section - auto-populated from events */}
                {selectedObjectId && (
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Журнал работ</Text>

                        {journalEntries.length === 0 && opPurchases.length === 0 && opDeliveries.length === 0 ? (
                            <Text style={{ color: '#A1A1AA', textAlign: 'center', paddingVertical: 20 }}>Нет записей в журнале</Text>
                        ) : (
                            <>
                                {/* Manual journal entries */}
                                {journalEntries.slice(0, 5).map((j) => (
                                    <View key={j.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#334155' }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <Text style={{ color: '#0ea5e9', fontSize: 14, fontWeight: '600' }}>
                                                {new Date(j.entry_date).toLocaleDateString('ru-RU')}
                                            </Text>
                                            {j.weather && (
                                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>{j.weather}</Text>
                                            )}
                                        </View>
                                        <Text style={{ color: '#fff', fontSize: 14, marginBottom: 4 }}>{j.main_events}</Text>
                                        {j.supervisor_notes && (
                                            <Text style={{ color: '#f59e0b', fontSize: 12, fontStyle: 'italic' }}>
                                                Замечания: {j.supervisor_notes}
                                            </Text>
                                        )}
                                    </View>
                                ))}

                                {/* Auto-generated journal from operational events */}
                                {(opPurchases.length > 0 || opDeliveries.length > 0 || opFinances.length > 0) && (
                                    <>
                                        {journalEntries.length > 0 && <View style={{ height: 1, backgroundColor: '#475569', marginVertical: 8 }} />}
                                        <Text style={{ color: '#0ea5e9', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Автоматический журнал</Text>
                                        {/* Group events chronologically */}
                                        {[...opPurchases.map((p: any) => ({
                                            id: p.id, date: p.created_at,
                                            icon: '', text: `Закупка ${p.po_no || ''}${p.supplier ? ' от ' + p.supplier : ''}`,
                                            detail: p.amount ? `${Number(p.amount).toLocaleString('ru-RU')} сом` : p.status,
                                            color: '#0ea5e9'
                                        })),
                                        ...opDeliveries.slice(0, 10).map((d: any) => ({
                                            id: d.id, date: d.created_at,
                                            icon: '', text: `Приход ${d.po_no || ''}${d.supplier ? ' от ' + d.supplier : ''}`,
                                            detail: `${Number(d.qty || 0).toLocaleString('ru-RU')} ед. — ${d.status === 'confirmed' ? 'Принят' : 'Ожидает'}`,
                                            color: d.status === 'confirmed' ? '#22c55e' : '#f59e0b'
                                        })),
                                        ...opFinances.map((f: any) => ({
                                            id: f.id, date: f.transaction_date,
                                            icon: '', text: f.description || `${f.type === 'expense' ? 'Расход' : 'Доход'}: ${f.category}`,
                                            detail: `${Number(f.amount || 0).toLocaleString('ru-RU')} сом`,
                                            color: f.type === 'expense' ? '#ef4444' : '#22c55e'
                                        }))]
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .slice(0, 15)
                                            .map((evt: any, i: number) => (
                                                <View key={evt.id || i} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#334155', gap: 10 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ color: '#fff', fontSize: 13 }} numberOfLines={1}>{evt.text}</Text>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                                                            <Text style={{ color: '#64748b', fontSize: 11 }}>
                                                                {evt.date ? new Date(evt.date).toLocaleDateString('ru-RU') : '—'}
                                                            </Text>
                                                            <Text style={{ color: evt.color, fontSize: 11, fontWeight: '600' }}>{evt.detail}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            ))}
                                    </>
                                )}
                            </>
                        )}
                    </View>
                )}

                {/* Purchases Section */}
                {selectedObjectId && opPurchases.length > 0 && (
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Закупки ({opPurchases.length})</Text>
                        {opPurchases.slice(0, 10).map((p: any, i: number) => (
                            <View key={p.id || i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#334155' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{p.po_no || '—'}</Text>
                                    <Text style={{ color: '#64748b', fontSize: 12 }}>{p.supplier || '—'} • {p.created_at ? new Date(p.created_at).toLocaleDateString('ru-RU') : ''}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    {p.amount && <Text style={{ color: '#0ea5e9', fontSize: 16, fontWeight: '700' }}>{Number(p.amount).toLocaleString('ru-RU')} сом</Text>}
                                    <Text style={{
                                        fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
                                        color: p.status === 'Утверждено' ? '#22c55e' : p.status === 'pending' ? '#f59e0b' : '#94a3b8',
                                        backgroundColor: p.status === 'Утверждено' ? 'rgba(34,197,94,0.15)' : p.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(148,163,184,0.15)',
                                    }}>{p.status === 'Утверждено' ? 'Утверждено' : p.status === 'pending' ? 'Ожидает' : p.status || '—'}</Text>
                                    {p.payment_status && (
                                        <Text style={{
                                            fontSize: 9, marginTop: 2,
                                            color: p.payment_status === 'Оплачено' ? '#22c55e'
                                                : p.payment_status === 'Частично оплачено' ? '#f59e0b'
                                                    : p.payment_status === 'Не оплачено' ? '#ef4444'
                                                        : p.payment_status === 'К оплате' ? '#a78bfa'
                                                            : '#94a3b8',
                                        }}>{p.payment_status}</Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Finances Section */}
                {selectedObjectId && opFinances.length > 0 && (
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Финансы ({opFinances.length})</Text>
                        {(() => {
                            const totalExpense = opFinances.filter((f: any) => f.type === 'expense').reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
                            const totalIncome = opFinances.filter((f: any) => f.type === 'income').reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
                            return (
                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                    <View style={{ flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                                        <Text style={{ color: '#ef4444', fontSize: 11 }}>Расходы</Text>
                                        <Text style={{ color: '#ef4444', fontSize: 20, fontWeight: '800' }}>{totalExpense.toLocaleString('ru-RU')}</Text>
                                    </View>
                                    {totalIncome > 0 && (
                                        <View style={{ flex: 1, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                                            <Text style={{ color: '#22c55e', fontSize: 11 }}>Доходы</Text>
                                            <Text style={{ color: '#22c55e', fontSize: 20, fontWeight: '800' }}>{totalIncome.toLocaleString('ru-RU')}</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })()}
                        {opFinances.slice(0, 10).map((f: any, i: number) => (
                            <View key={f.id || i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#334155' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#fff', fontSize: 13 }} numberOfLines={1}>{f.description || `${f.category}`}</Text>
                                    <Text style={{ color: '#64748b', fontSize: 11 }}>{f.transaction_date ? new Date(f.transaction_date).toLocaleDateString('ru-RU') : '—'}</Text>
                                </View>
                                <Text style={{ color: f.type === 'expense' ? '#ef4444' : '#22c55e', fontSize: 15, fontWeight: '700' }}>
                                    {f.type === 'expense' ? '-' : '+'}{Number(f.amount || 0).toLocaleString('ru-RU')}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Personnel Section - enhanced with members */}
                {selectedObjectId && (personnelLogs.length > 0 || opMembers.length > 0) && (
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Персонал</Text>
                        {personnelLogs.slice(0, 5).map((p: any) => (
                            <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#334155' }}>
                                <Text style={{ color: '#fff', fontSize: 14 }}>{p.specialty}</Text>
                                <Text style={{ color: '#0ea5e9', fontSize: 14, fontWeight: '600' }}>{p.worker_count} чел. × {p.hours_worked}ч</Text>
                            </View>
                        ))}
                        {opMembers.length > 0 && (
                            <>
                                {personnelLogs.length > 0 && <View style={{ height: 1, backgroundColor: '#475569', marginVertical: 8 }} />}
                                <Text style={{ color: '#0ea5e9', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Участники объекта ({opMembers.length})</Text>
                                {opMembers.map((m: any, i: number) => (
                                    <View key={m.id || i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#334155' }}>
                                        <Text style={{ color: '#fff', fontSize: 14 }}>{m.full_name || '—'}</Text>
                                        <Text style={{ color: '#94a3b8', fontSize: 13 }}>{m.role || '—'}</Text>
                                    </View>
                                ))}
                            </>
                        )}
                    </View>
                )}

                {/* Quality Section */}
                {selectedObjectId && qualityChecks.length > 0 && (
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Контроль качества</Text>
                        {qualityChecks.slice(0, 5).map((q: any) => (
                            <View key={q.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#334155' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>{q.check_type === 'hidden_work' ? 'Скрытые работы' : 'Проверка'}</Text>
                                    <Text style={{ color: q.has_issues ? '#ef4444' : '#22c55e', fontSize: 12 }}>{q.has_issues ? 'Есть замечания' : 'Норма'}</Text>
                                </View>
                                <Text style={{ color: '#fff', fontSize: 14 }}>{q.work_description}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Safety Section */}
                {selectedObjectId && safetyRecords.length > 0 && (
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>ОТ/ТБ</Text>
                        {safetyRecords.slice(0, 5).map((s: any) => (
                            <View key={s.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#334155' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                        {s.record_type === 'briefing' ? 'Инструктаж' : s.record_type === 'violation' ? 'Нарушение' : 'Инцидент'}
                                    </Text>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12 }}>{new Date(s.record_date).toLocaleDateString('ru-RU')}</Text>
                                </View>
                                <Text style={{ color: '#fff', fontSize: 14 }}>{s.description}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Problems Section */}
                {selectedObjectId && problemReports.length > 0 && (
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Проблемы и риски</Text>
                        {problemReports.slice(0, 5).map((pr: any) => (
                            <View key={pr.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#334155' }}>
                                <Text style={{ color: '#fff', fontSize: 14, marginBottom: 4 }}>{pr.problem_description}</Text>
                                {pr.proposed_solution && (
                                    <Text style={{ color: '#22c55e', fontSize: 12 }}>Решение: {pr.proposed_solution}</Text>
                                )}
                                {pr.requires_customer_decision && (
                                    <Text style={{ color: '#f59e0b', fontSize: 11, marginTop: 4 }}>Ожидает решения заказчика</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Photos Section */}
                {selectedObjectId && photos.length > 0 && (
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Фотофиксация ({photos.length})</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                {photos.map((photo: any) => (
                                    <View key={photo.id} style={{ width: 150 }}>
                                        <Image
                                            source={{ uri: photo.photo_url }}
                                            style={{ width: 150, height: 120, borderRadius: 10, backgroundColor: '#334155' }}
                                            resizeMode="cover"
                                        />
                                        <Text style={{ color: '#fff', fontSize: 11, marginTop: 4 }} numberOfLines={2}>
                                            {photo.caption}
                                        </Text>
                                        {photo.latitude && (
                                            <Text style={{ color: '#A1A1AA', fontSize: 10 }}>
                                                {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}
                                            </Text>
                                        )}
                                        <Text style={{ color: '#A1A1AA', fontSize: 9 }}>
                                            {new Date(photo.taken_at).toLocaleDateString('ru-RU')}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                )}

                {/* Summary & Signatures Section */}
                {selectedObjectId && (
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>🖋️ Итоги и подписи</Text>

                        <View style={{ backgroundColor: '#0f172a', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ color: '#94a3b8', fontSize: 13 }}>Выполнение (общие):</Text>
                                <Text style={{ color: '#0ea5e9', fontWeight: '700' }}>{objects.find(o => o.id === selectedObjectId)?.total_completion || 0}%</Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' }}>
                                <View style={{ height: '100%', backgroundColor: '#0ea5e9', width: `${objects.find(o => o.id === selectedObjectId)?.total_completion || 0}%` }} />
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                                <View style={{ width: '100%', height: 40, borderBottomWidth: 1, borderColor: '#475569', justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '700' }}>✓ ПОДПИСАНО</Text>
                                </View>
                                <Text style={{ color: '#A1A1AA', fontSize: 10 }}>Прораб</Text>
                            </View>
                            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                                <View style={{ width: '100%', height: 40, borderBottomWidth: 1, borderColor: '#475569', justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: '#A1A1AA', fontSize: 10, fontStyle: 'italic' }}>ожидание...</Text>
                                </View>
                                <Text style={{ color: '#A1A1AA', fontSize: 10 }}>Технадзор</Text>
                            </View>
                            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                                <View style={{ width: '100%', height: 40, borderBottomWidth: 1, borderColor: '#475569', justifyContent: 'center', alignItems: 'center' }}>
                                    <View style={{ width: 30, height: 1, backgroundColor: '#475569' }} />
                                </View>
                                <Text style={{ color: '#A1A1AA', fontSize: 10 }}>Заказчик</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Add new object button */}
                {objects.length > 0 && (
                    <Pressable
                        style={{ backgroundColor: '#334155', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 }}
                        onPress={() => setShowObjectForm(true)}
                    >
                        <Text style={{ color: '#94a3b8', fontWeight: '600' }}>➕ Добавить новый объект</Text>
                    </Pressable>
                )}
            </View>

            {/* Bottom Sheet: Object Passport Form */}
            <BottomSheetForm
                visible={showObjectForm}
                onClose={() => setShowObjectForm(false)}
                title="Паспорт объекта"
                onSubmit={saveObjectPassport}
                submitLabel="Сохранить"
                submitLoading={saving}
                height={85}
            >
                <FormField label="Наименование объекта" required>
                    <View>
                        <TextInput
                            style={inputStyle}
                            value={objectForm.name || ''}
                            onChangeText={(v) => {
                                setObjectForm(prev => ({ ...prev, name: v }));
                                setObjectSearch(v);
                                setShowObjectSuggestions(v.length > 0);
                            }}
                            placeholder="Жилой комплекс «Солнечный»"
                            placeholderTextColor="#64748b"
                        />
                        {showObjectSuggestions && (
                            <View style={{
                                backgroundColor: '#0f172a',
                                borderRadius: 10,
                                marginTop: 4,
                                borderWidth: 1,
                                borderColor: '#334155',
                                maxHeight: 200,
                                overflow: 'hidden'
                            }}>
                                {(allObjects || [])
                                    .filter(o => o.name.toLowerCase().includes(objectSearch.toLowerCase()))
                                    .map(o => (
                                        <Pressable
                                            key={o.id}
                                            style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}
                                            onPress={() => {
                                                setObjectForm(prev => ({
                                                    ...prev,
                                                    name: o.name,
                                                    address: o.address || prev.address,
                                                    customer: o.client_name || o.customer || prev.customer,
                                                    object_id: o.id
                                                }));
                                                setShowObjectSuggestions(false);
                                            }}
                                        >
                                            <Text style={{ color: '#fff', fontWeight: '600' }}>{o.name}</Text>
                                            {o.address && <Text style={{ color: '#94a3b8', fontSize: 12 }}>{o.address}</Text>}
                                        </Pressable>
                                    ))
                                }
                                <Pressable
                                    style={{ padding: 12, alignItems: 'center', backgroundColor: '#1e293b' }}
                                    onPress={() => setShowObjectSuggestions(false)}
                                >
                                    <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '600' }}>+ Оставить как есть (новый)</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </FormField>

                <FormField label="Адрес строительства">
                    <TextInput
                        style={inputStyle}
                        value={objectForm.address || ''}
                        onChangeText={(v) => setObjectForm(prev => ({ ...prev, address: v }))}
                        placeholder="г. Бишкек, ул. Примерная, 123"
                        placeholderTextColor="#64748b"
                    />
                </FormField>

                <FormRow>
                    <View style={{ flex: 1 }}>
                        <FormField label="Заказчик">
                            <TextInput
                                style={inputStyle}
                                value={objectForm.customer || ''}
                                onChangeText={(v) => setObjectForm(prev => ({ ...prev, customer: v }))}
                                placeholder="ООО «Заказчик»"
                                placeholderTextColor="#64748b"
                            />
                        </FormField>
                    </View>
                    <View style={{ flex: 1 }}>
                        <FormField label="Генподрядчик">
                            <TextInput
                                style={inputStyle}
                                value={objectForm.contractor || ''}
                                onChangeText={(v) => setObjectForm(prev => ({ ...prev, contractor: v }))}
                                placeholder="ООО «Строитель»"
                                placeholderTextColor="#64748b"
                            />
                        </FormField>
                    </View>
                </FormRow>

                <FormRow>
                    <View style={{ flex: 1 }}>
                        <FormField label="№ договора">
                            <TextInput
                                style={inputStyle}
                                value={objectForm.contract_number || ''}
                                onChangeText={(v) => setObjectForm(prev => ({ ...prev, contract_number: v }))}
                                placeholder="ДП-2026/001"
                                placeholderTextColor="#64748b"
                            />
                        </FormField>
                    </View>
                    <View style={{ flex: 1 }}>
                        <FormField label="Разрешение №">
                            <TextInput
                                style={inputStyle}
                                value={objectForm.permit_number || ''}
                                onChangeText={(v) => setObjectForm(prev => ({ ...prev, permit_number: v }))}
                                placeholder="РС-123/2026"
                                placeholderTextColor="#64748b"
                            />
                        </FormField>
                    </View>
                </FormRow>

                <FormField label="Прораб">
                    <TextInput
                        style={inputStyle}
                        value={objectForm.foreman_name || ''}
                        onChangeText={(v) => setObjectForm(prev => ({ ...prev, foreman_name: v }))}
                        placeholder="Иванов И.И."
                        placeholderTextColor="#64748b"
                    />
                </FormField>

                <FormField label="Инженер ПТО">
                    <TextInput
                        style={inputStyle}
                        value={objectForm.engineer_name || ''}
                        onChangeText={(v) => setObjectForm(prev => ({ ...prev, engineer_name: v }))}
                        placeholder="Петров П.П."
                        placeholderTextColor="#64748b"
                    />
                </FormField>

                <FormField label="Технадзор">
                    <TextInput
                        style={inputStyle}
                        value={objectForm.supervisor_name || ''}
                        onChangeText={(v) => setObjectForm(prev => ({ ...prev, supervisor_name: v }))}
                        placeholder="Сидоров С.С."
                        placeholderTextColor="#64748b"
                    />
                </FormField>
            </BottomSheetForm>

            {/* Bottom Sheet: Work Report Form */}
            <BottomSheetForm
                visible={showWorkForm}
                onClose={() => setShowWorkForm(false)}
                title="Добавить работу"
                onSubmit={saveWorkReport}
                submitLabel="Добавить"
                submitLoading={saving}
                height={70}
            >
                <FormField label="Вид работ" required>
                    <View>
                        <TextInput
                            style={inputStyle}
                            value={workForm.work_type}
                            onChangeText={(v) => {
                                setWorkForm(prev => ({ ...prev, work_type: v }));
                                setWorkSearch(v);
                                setShowWorkSuggestions(v.length > 0);
                            }}
                            placeholder="Например: Штукатурка стен"
                            placeholderTextColor="#64748b"
                        />
                        {showWorkSuggestions && (
                            <View style={{
                                backgroundColor: '#0f172a',
                                borderRadius: 10,
                                marginTop: 4,
                                borderWidth: 1,
                                borderColor: '#334155',
                                maxHeight: 150,
                                overflow: 'hidden'
                            }}>
                                {commonWorks
                                    .filter(w => w.toLowerCase().includes(workSearch.toLowerCase()))
                                    .map((w, idx) => (
                                        <Pressable
                                            key={idx}
                                            style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}
                                            onPress={() => {
                                                setWorkForm(prev => ({ ...prev, work_type: w }));
                                                setShowWorkSuggestions(false);
                                            }}
                                        >
                                            <Text style={{ color: '#fff' }}>{w}</Text>
                                        </Pressable>
                                    ))
                                }
                                <Pressable
                                    style={{ padding: 8, alignItems: 'center', backgroundColor: '#1e293b' }}
                                    onPress={() => setShowWorkSuggestions(false)}
                                >
                                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>Закрыть список</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </FormField>

                <FormRow>
                    <View style={{ flex: 1 }}>
                        <FormField label="Ед. изм.">
                            <TextInput
                                style={inputStyle}
                                value={workForm.unit}
                                onChangeText={(v) => setWorkForm(prev => ({ ...prev, unit: v }))}
                                placeholder="м³"
                                placeholderTextColor="#64748b"
                            />
                        </FormField>
                    </View>
                    <View style={{ flex: 1 }}>
                        <FormField label="План">
                            <TextInput
                                style={inputStyle}
                                value={workForm.plan_qty}
                                onChangeText={(v) => setWorkForm(prev => ({ ...prev, plan_qty: v }))}
                                placeholder="0"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                            />
                        </FormField>
                    </View>
                    <View style={{ flex: 1 }}>
                        <FormField label="Факт">
                            <TextInput
                                style={inputStyle}
                                value={workForm.fact_qty}
                                onChangeText={(v) => setWorkForm(prev => ({ ...prev, fact_qty: v }))}
                                placeholder="0"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                            />
                        </FormField>
                    </View>
                </FormRow>

                <FormField label="Примечание">
                    <TextInput
                        style={[inputStyle, { height: 80, textAlignVertical: 'top' }]}
                        value={workForm.note}
                        onChangeText={(v) => setWorkForm(prev => ({ ...prev, note: v }))}
                        placeholder="Причина отклонения, комментарий..."
                        placeholderTextColor="#64748b"
                        multiline
                    />
                </FormField>
            </BottomSheetForm>

            {/* Bottom Sheet: Material Form */}
            <BottomSheetForm
                visible={showMaterialForm}
                onClose={() => setShowMaterialForm(false)}
                title="Добавить материал"
                onSubmit={saveMaterial}
                submitLabel="Добавить"
                submitLoading={saving}
                height={65}
            >
                <FormField label="Название материала" required>
                    <View>
                        <TextInput
                            style={inputStyle}
                            value={materialForm.material_name}
                            onChangeText={(v) => {
                                setMaterialForm(prev => ({ ...prev, material_name: v }));
                                setMaterialSearch(v);
                                setShowMaterialSuggestions(v.length > 0);
                            }}
                            placeholder="Например: Цемент М500"
                            placeholderTextColor="#64748b"
                        />
                        {showMaterialSuggestions && (
                            <View style={{
                                backgroundColor: '#0f172a',
                                borderRadius: 10,
                                marginTop: 4,
                                borderWidth: 1,
                                borderColor: '#334155',
                                maxHeight: 150,
                                overflow: 'hidden'
                            }}>
                                {commonMaterials
                                    .filter(m => m.toLowerCase().includes(materialSearch.toLowerCase()))
                                    .map((m, idx) => (
                                        <Pressable
                                            key={idx}
                                            style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}
                                            onPress={() => {
                                                setMaterialForm(prev => ({ ...prev, material_name: m }));
                                                setShowMaterialSuggestions(false);
                                            }}
                                        >
                                            <Text style={{ color: '#fff' }}>{m}</Text>
                                        </Pressable>
                                    ))
                                }
                                <Pressable
                                    style={{ padding: 8, alignItems: 'center', backgroundColor: '#1e293b' }}
                                    onPress={() => setShowMaterialSuggestions(false)}
                                >
                                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>Закрыть список</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </FormField>

                <FormRow>
                    <View style={{ flex: 1 }}>
                        <FormField label="Количество">
                            <TextInput
                                style={inputStyle}
                                value={materialForm.quantity}
                                onChangeText={(v) => setMaterialForm(prev => ({ ...prev, quantity: v }))}
                                placeholder="0"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                            />
                        </FormField>
                    </View>
                    <View style={{ flex: 1 }}>
                        <FormField label="Ед. изм.">
                            <TextInput
                                style={inputStyle}
                                value={materialForm.unit}
                                onChangeText={(v) => setMaterialForm(prev => ({ ...prev, unit: v }))}
                                placeholder="м³"
                                placeholderTextColor="#64748b"
                            />
                        </FormField>
                    </View>
                </FormRow>

                <FormField label="№ документа (ТТН)">
                    <TextInput
                        style={inputStyle}
                        value={materialForm.document_number}
                        onChangeText={(v) => setMaterialForm(prev => ({ ...prev, document_number: v }))}
                        placeholder="ТТН №45"
                        placeholderTextColor="#64748b"
                    />
                </FormField>

                <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}
                    onPress={() => setMaterialForm(prev => ({ ...prev, has_certificate: !prev.has_certificate }))}
                >
                    <View style={{
                        width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                        borderColor: materialForm.has_certificate ? '#22c55e' : '#475569',
                        backgroundColor: materialForm.has_certificate ? '#22c55e' : 'transparent',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        {materialForm.has_certificate && <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text>}
                    </View>
                    <Text style={{ color: '#fff', fontSize: 15 }}>Есть сертификат качества</Text>
                </Pressable>
            </BottomSheetForm>

            {/* Bottom Sheet: Journal Entry Form */}
            <BottomSheetForm
                visible={showJournalForm}
                onClose={() => setShowJournalForm(false)}
                title="Запись в журнал"
                onSubmit={saveJournalEntry}
                submitLabel="Добавить"
                submitLoading={saving}
                height={75}
            >
                <FormField label="Погодные условия">
                    <TextInput
                        style={inputStyle}
                        value={journalForm.weather}
                        onChangeText={(v) => setJournalForm(prev => ({ ...prev, weather: v }))}
                        placeholder="Ясно, +18°C"
                        placeholderTextColor="#64748b"
                    />
                </FormField>

                <FormField label="Состав бригад">
                    <TextInput
                        style={inputStyle}
                        value={journalForm.team_composition}
                        onChangeText={(v) => setJournalForm(prev => ({ ...prev, team_composition: v }))}
                        placeholder="12 рабочих, 2 крана"
                        placeholderTextColor="#64748b"
                    />
                </FormField>

                <FormField label="Основные события дня" required>
                    <TextInput
                        style={[inputStyle, { height: 100, textAlignVertical: 'top' }]}
                        value={journalForm.main_events}
                        onChangeText={(v) => setJournalForm(prev => ({ ...prev, main_events: v }))}
                        placeholder="Завершено бетонирование плиты перекрытия 3 этажа. Начаты работы по армированию..."
                        placeholderTextColor="#64748b"
                        multiline
                    />
                </FormField>

                <FormField label="Замечания технадзора">
                    <TextInput
                        style={[inputStyle, { height: 60, textAlignVertical: 'top' }]}
                        value={journalForm.supervisor_notes}
                        onChangeText={(v) => setJournalForm(prev => ({ ...prev, supervisor_notes: v }))}
                        placeholder="Нарушений не выявлено"
                        placeholderTextColor="#64748b"
                        multiline
                    />
                </FormField>
            </BottomSheetForm>

            {/* Bottom Sheet: Personnel Form */}
            <BottomSheetForm
                visible={showPersonnelForm}
                onClose={() => setShowPersonnelForm(false)}
                title="Добавить персонал"
                onSubmit={savePersonnel}
                submitLabel="Добавить"
                submitLoading={saving}
                height={65}
            >
                <FormField label="Специальность" required>
                    <TextInput
                        style={inputStyle}
                        value={personnelForm.specialty}
                        onChangeText={(v) => setPersonnelForm(prev => ({ ...prev, specialty: v }))}
                        placeholder="Бетонщик, арматурщик..."
                        placeholderTextColor="#64748b"
                    />
                </FormField>
                <FormRow>
                    <View style={{ flex: 1 }}>
                        <FormField label="Кол-во человек">
                            <TextInput
                                style={inputStyle}
                                value={personnelForm.worker_count}
                                onChangeText={(v) => setPersonnelForm(prev => ({ ...prev, worker_count: v }))}
                                placeholder="0"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                            />
                        </FormField>
                    </View>
                    <View style={{ flex: 1 }}>
                        <FormField label="Отраб. часов">
                            <TextInput
                                style={inputStyle}
                                value={personnelForm.hours_worked}
                                onChangeText={(v) => setPersonnelForm(prev => ({ ...prev, hours_worked: v }))}
                                placeholder="8"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                            />
                        </FormField>
                    </View>
                </FormRow>
            </BottomSheetForm>

            {/* Bottom Sheet: Quality Form */}
            <BottomSheetForm
                visible={showQualityForm}
                onClose={() => setShowQualityForm(false)}
                title="Контроль качества"
                onSubmit={saveQuality}
                submitLabel="Сохранить"
                submitLoading={saving}
                height={60}
            >
                <FormField label="Тип проверки">
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[{ key: 'inspection', label: '📋 Проверка' }, { key: 'hidden_work', label: '🔍 АОСР' }].map(opt => (
                            <Pressable
                                key={opt.key}
                                onPress={() => setQualityForm(prev => ({ ...prev, check_type: opt.key }))}
                                style={{
                                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
                                    backgroundColor: qualityForm.check_type === opt.key ? '#0ea5e9' : '#334155',
                                }}
                            >
                                <Text style={{ color: '#fff', fontSize: 13 }}>{opt.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </FormField>
                <FormField label="Описание работ" required>
                    <TextInput
                        style={[inputStyle, { height: 80, textAlignVertical: 'top' }]}
                        value={qualityForm.work_description}
                        onChangeText={(v) => setQualityForm(prev => ({ ...prev, work_description: v }))}
                        placeholder="Бетонирование фундамента блок А"
                        placeholderTextColor="#64748b"
                        multiline
                    />
                </FormField>
                <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}
                    onPress={() => setQualityForm(prev => ({ ...prev, has_issues: !prev.has_issues }))}
                >
                    <View style={{
                        width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                        borderColor: qualityForm.has_issues ? '#ef4444' : '#475569',
                        backgroundColor: qualityForm.has_issues ? '#ef4444' : 'transparent',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        {qualityForm.has_issues && <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text>}
                    </View>
                    <Text style={{ color: '#fff', fontSize: 15 }}>Есть замечания / отклонения</Text>
                </Pressable>
            </BottomSheetForm>

            {/* Bottom Sheet: Safety Form */}
            <BottomSheetForm
                visible={showSafetyForm}
                onClose={() => setShowSafetyForm(false)}
                title="ОТ/ТБ запись"
                onSubmit={saveSafety}
                submitLabel="Сохранить"
                submitLoading={saving}
                height={55}
            >
                <FormField label="Тип записи">
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        {[
                            { key: 'briefing', label: '📋 Инструктаж' },
                            { key: 'violation', label: '⚠️ Нарушение' },
                            { key: 'incident', label: '🚨 Инцидент' }
                        ].map(opt => (
                            <Pressable
                                key={opt.key}
                                onPress={() => setSafetyForm(prev => ({ ...prev, record_type: opt.key }))}
                                style={{
                                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                                    backgroundColor: safetyForm.record_type === opt.key ? '#ef4444' : '#334155',
                                }}
                            >
                                <Text style={{ color: '#fff', fontSize: 13 }}>{opt.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </FormField>
                <FormField label="Описание" required>
                    <TextInput
                        style={[inputStyle, { height: 80, textAlignVertical: 'top' }]}
                        value={safetyForm.description}
                        onChangeText={(v) => setSafetyForm(prev => ({ ...prev, description: v }))}
                        placeholder="Проведён вводный инструктаж..."
                        placeholderTextColor="#64748b"
                        multiline
                    />
                </FormField>
                <FormField label="Меры">
                    <TextInput
                        style={inputStyle}
                        value={safetyForm.measures_taken}
                        onChangeText={(v) => setSafetyForm(prev => ({ ...prev, measures_taken: v }))}
                        placeholder="Устранено, выдано предупреждение..."
                        placeholderTextColor="#64748b"
                    />
                </FormField>
            </BottomSheetForm>

            {/* Bottom Sheet: Problem Form */}
            <BottomSheetForm
                visible={showProblemForm}
                onClose={() => setShowProblemForm(false)}
                title="Проблема / Риск"
                onSubmit={saveProblem}
                submitLabel="Зафиксировать"
                submitLoading={saving}
                height={75}
            >
                <FormField label="Описание проблемы" required>
                    <TextInput
                        style={[inputStyle, { height: 80, textAlignVertical: 'top' }]}
                        value={problemForm.problem_description}
                        onChangeText={(v) => setProblemForm(prev => ({ ...prev, problem_description: v }))}
                        placeholder="Задержка поставки арматуры..."
                        placeholderTextColor="#64748b"
                        multiline
                    />
                </FormField>
                <FormField label="Причина">
                    <TextInput
                        style={inputStyle}
                        value={problemForm.cause}
                        onChangeText={(v) => setProblemForm(prev => ({ ...prev, cause: v }))}
                        placeholder="Сбой у поставщика"
                        placeholderTextColor="#64748b"
                    />
                </FormField>
                <FormField label="Влияние на сроки">
                    <TextInput
                        style={inputStyle}
                        value={problemForm.schedule_impact}
                        onChangeText={(v) => setProblemForm(prev => ({ ...prev, schedule_impact: v }))}
                        placeholder="Задержка 3 дня"
                        placeholderTextColor="#64748b"
                    />
                </FormField>
                <FormField label="Предлагаемое решение">
                    <TextInput
                        style={inputStyle}
                        value={problemForm.proposed_solution}
                        onChangeText={(v) => setProblemForm(prev => ({ ...prev, proposed_solution: v }))}
                        placeholder="Заказать у альтернативного поставщика"
                        placeholderTextColor="#64748b"
                    />
                </FormField>
                <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}
                    onPress={() => setProblemForm(prev => ({ ...prev, requires_customer_decision: !prev.requires_customer_decision }))}
                >
                    <View style={{
                        width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                        borderColor: problemForm.requires_customer_decision ? '#f59e0b' : '#475569',
                        backgroundColor: problemForm.requires_customer_decision ? '#f59e0b' : 'transparent',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        {problemForm.requires_customer_decision && <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text>}
                    </View>
                    <Text style={{ color: '#fff', fontSize: 15 }}>Требует решения заказчика</Text>
                </Pressable>
            </BottomSheetForm>
        </ScrollView>
    );
}

const inputStyle = {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
};
