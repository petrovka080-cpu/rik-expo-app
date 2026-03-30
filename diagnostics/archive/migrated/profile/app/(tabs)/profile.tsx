import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Switch,
  TouchableOpacity,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../../shared/i18n';
import { useAuth } from '../../src/context/AuthContext';
import { clearProfileCache } from '../../src/lib/rik_api';
import { UI } from '../../src/styles/theme';

// Helper to decode base64 to Uint8Array for Storage upload
const decode = (base64: string): Uint8Array => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bufferLength = base64.length * 0.75;
  const len = base64.length;
  let p = 0;
  let encoded1, encoded2, encoded3, encoded4;

  if (base64[base64.length - 1] === '=') {
    (bufferLength as number)--;
    if (base64[base64.length - 2] === '=') {
      (bufferLength as number)--;
    }
  }

  const arraybuffer = new Uint8Array(bufferLength);
  for (let i = 0; i < len; i += 4) {
    encoded1 = chars.indexOf(base64[i]);
    encoded2 = chars.indexOf(base64[i + 1]);
    encoded3 = chars.indexOf(base64[i + 2]);
    encoded4 = chars.indexOf(base64[i + 3]);
    arraybuffer[p++] = (encoded1 << 2) | (encoded2 >> 4);
    arraybuffer[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    arraybuffer[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return arraybuffer;
};

// Roles mapping
const ROLE_NAMES = {
  'foreman': 'screens.profile.roles.foreman',
  'buyer': 'screens.profile.roles.buyer',
  'supplier': 'screens.profile.roles.supplier',
  'director': 'screens.profile.roles.director',
  'accountant': 'screens.profile.roles.accountant',
  'warehouse': 'screens.profile.roles.warehouse',
  'contractor': 'screens.profile.roles.contractor',
  'security': 'screens.profile.roles.security',
  'guest': 'screens.profile.roles.guest'
};

const ROLE_COLORS: Record<string, string> = {
  foreman: '#3B82F6',
  buyer: '#8B5CF6',
  supplier: '#F97316',
  director: '#0EA5E9',
  accountant: '#84CC16',
  warehouse: '#A855F7',
  contractor: '#10B981',
  security: '#EF4444',
  guest: '#64748B',
};

const InfoItem = ({ label, value, editable, onChangeText, placeholder, showCopy }: any) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      {editable ? (
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.surface }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
        />
      ) : (
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      )}
      {showCopy && (
        <Pressable
          onPress={() => {
            if (Platform.OS === 'web') {
              navigator.clipboard.writeText(value);
              alert(t('screens.profile.alerts.copied'));
            } else {
              Alert.alert(t('screens.profile.alerts.copy'), t('screens.profile.alerts.copied'));
            }
          }}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="copy-outline" size={20} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
};


export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);

  // Company state
  const [companyName, setCompanyName] = useState('');
  const [companyInn, setCompanyInn] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyBank, setCompanyBank] = useState('');
  const [companyAccount, setCompanyAccount] = useState(''); // We'll store this in bank_details for now or separate if needed
  const [companyInviteCode, setCompanyInviteCode] = useState<string | null>(null);
  const [companyColumnKeys, setCompanyColumnKeys] = useState<string[]>([]);

  // Initialize state when profile loads
  const fetchCompanyDetails = useCallback(async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        const row = data as any;
        const keys = Object.keys(row || {});
        setCompanyColumnKeys(keys);
        setCompanyName(row.name || '');
        setCompanyInn(row.inn || '');
        setCompanyAddress(row.address || '');
        setCompanyBank(row.bank_details || row.bank_name || '');
        setCompanyAccount(row.bank_account || row.account || '');
        setCompanyInviteCode(row.invite_code || null);

        // Backfill personal phone from company phone for old records where profile.phone is empty.
        setPhone((currentPhone) => currentPhone || row.phone || row.phone_main || '');

        // Fallback: if requisites are not present in company row, use first object data.
        if (!row.address || !(row.phone || row.phone_main)) {
          const { data: firstObject } = await supabase
            .from('objects')
            .select('name, address, phone')
            .eq('company_id', companyId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (firstObject) {
            const obj = firstObject as any;
            if (!row.address && obj.address) {
              setCompanyAddress(obj.address);
            }
            if (!row.name && obj.name) {
              setCompanyName(obj.name);
            }
            setPhone((currentPhone) => currentPhone || row.phone || row.phone_main || obj.phone || '');
          }
        }
      }
    } catch (e) {
      console.error('Error fetching company:', e);
    }
  }, []);

  React.useEffect(() => {
    if (profile && !editing) {
      setName(profile.full_name || '');
      setPhone(profile.phone || '');

      // If user has a company_id, fetch company details separately
      if (profile.company_id) {
        fetchCompanyDetails(profile.company_id);
      }
    }
  }, [editing, fetchCompanyDetails, profile]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {

        setTempAvatar(result.assets[0].uri);
        setEditing(true); // Auto-enable edit mode so Save button appears
        Alert.alert(t('common.success'), t('screens.profile.alerts.avatarSuccess'));
      }
    } catch {
      Alert.alert(t('common.error'), t('screens.profile.alerts.avatarError'));
    }
  };

  const handleUpdate = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const userId = user?.id || (profile as any)?.user_id;
      if (!userId) {
        throw new Error('User id not found');
      }


      let avatarUrl = profile.avatar_url || null;

      // Upload avatar if new image selected
      if (tempAvatar) {
        try {
          const timestamp = Date.now();
          let extension = 'jpg';
          let contentType = 'image/jpeg';

          // Keep avatar files under user folder (common storage RLS pattern).
          // This improves compatibility with bucket policies scoped by auth uid.
          let filePath = `${userId}/${timestamp}.${extension}`;

          // For web: fetch blob from data URI
          if (Platform.OS === 'web') {
            const response = await fetch(tempAvatar);
            const blob = await response.blob();
            const blobType = blob.type || '';
            if (blobType.includes('png')) {
              extension = 'png';
              contentType = 'image/png';
            } else if (blobType.includes('webp')) {
              extension = 'webp';
              contentType = 'image/webp';
            } else if (blobType.includes('jpeg') || blobType.includes('jpg')) {
              extension = 'jpg';
              contentType = 'image/jpeg';
            }
            filePath = `${userId}/${timestamp}.${extension}`;

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, blob, {
                contentType,
                upsert: true
              });


            if (uploadError) {
              console.error('[Profile] Upload error:', uploadError);
              throw uploadError;
            }
          } else {
            // For native: read as base64 and upload
            const FileSystemModule = await import('expo-file-system/legacy');
            const uriExtMatch = /\.(png|jpg|jpeg|webp)$/i.exec(tempAvatar);
            if (uriExtMatch?.[1]) {
              const ext = uriExtMatch[1].toLowerCase();
              extension = ext === 'jpeg' ? 'jpg' : ext;
              contentType =
                extension === 'png'
                  ? 'image/png'
                  : extension === 'webp'
                    ? 'image/webp'
                    : 'image/jpeg';
            }
            filePath = `${userId}/${timestamp}.${extension}`;
            const base64 = await FileSystemModule.readAsStringAsync(tempAvatar, {
              encoding: 'base64' as any,
            });

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, decode(base64), {
                contentType,
                upsert: true
              });

            if (uploadError) {
              console.error('[Profile] Upload error:', uploadError);
              throw uploadError;
            }
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          avatarUrl = urlData.publicUrl;

        } catch (uploadErr: any) {
          console.error('[Profile] Avatar upload failed:', uploadErr);
          const msg = t('screens.profile.errors.avatarUpload', { error: uploadErr.message });
          if (Platform.OS === 'web') { alert(msg); } else { Alert.alert(t('common.error'), msg); }
          // Do not continue with a success flow if avatar upload failed.
          throw uploadErr;
        }
      }

      // Update profile with name, avatar, phone
      const updatePayload: Record<string, unknown> = {
        full_name: name.trim(),
        avatar_url: avatarUrl,
        phone: phone.trim() || null,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updatePayload as any)
        .eq('user_id', userId);

      if (profileError) {
        console.error('Update failed:', profileError);
        const msg = profileError.message;
        if (Platform.OS === 'web') { alert(msg); } else { Alert.alert(t('common.error'), msg); }
        throw profileError;
      }

      // 2. Update Company (if director and has company)
      if (profile.role === 'director' && profile.company_id) {
        let keys = companyColumnKeys;
        if (!keys.length) {
          const { data: companyRowProbe } = await supabase
            .from('companies')
            .select('*')
            .eq('id', profile.company_id)
            .maybeSingle();
          if (companyRowProbe) {
            keys = Object.keys(companyRowProbe as any);
            setCompanyColumnKeys(keys);
          }
        }

        const keySet = new Set(keys);
        const companyPayload: Record<string, unknown> = {};

        const assignFirstExisting = (candidates: string[], value: unknown) => {
          const key = candidates.find((k) => keySet.has(k));
          if (key) companyPayload[key] = value;
        };

        assignFirstExisting(['name'], companyName.trim());
        assignFirstExisting(['inn'], companyInn.trim() || null);
        assignFirstExisting(['address', 'legal_address'], companyAddress.trim() || null);
        assignFirstExisting(['phone', 'phone_main'], phone.trim() || null);
        assignFirstExisting(['bank_details', 'bank_name', 'bank'], companyBank.trim() || null);
        assignFirstExisting(['bank_account', 'account', 'settlement_account'], companyAccount.trim() || null);
        assignFirstExisting(['email'], user?.email || null);

        if (Object.keys(companyPayload).length > 0) {
          const { error: companyError } = await supabase
            .from('companies')
            .update(companyPayload as any)
            .eq('id', profile.company_id);

          if (companyError) {
            throw companyError;
          }
        }
      }

      setTempAvatar(null);
      clearProfileCache();
      await refreshProfile();
      if (profile.company_id) {
        await fetchCompanyDetails(profile.company_id);
      }
      setEditing(false);
      const successMsg = t('screens.profile.alerts.saveSuccess');
      if (Platform.OS === 'web') { alert(successMsg); } else { Alert.alert(t('common.success'), successMsg); }
    } catch (error: any) {
      const errMsg = error.message || 'Error saving profile';
      if (Platform.OS === 'web') { alert(errMsg); } else { Alert.alert(t('common.error'), errMsg); }
    } finally {
      setLoading(false);
    }
  };

  const performLogout = async () => {
    try {
      // Clear demo mode if set
      if (Platform.OS === 'web') {
        try {
          localStorage.removeItem('demo_mode');
          localStorage.removeItem('demo_role');
        } catch { /* ignore localStorage errors */ }
      }
      await supabase.auth.signOut();
      router.replace('/auth/login');
    } catch (e) {
      console.warn('[Logout] error:', e);
      router.replace('/auth/login');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('screens.profile.alerts.logoutConfirm'))) {
        performLogout();
      }
    } else {
      Alert.alert(
        t('screens.profile.logout'),
        t('screens.profile.alerts.logoutConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('screens.profile.logout'),
            onPress: performLogout,
            style: 'destructive'
          }
        ]
      );
    }
  };

  const { theme, colors, toggleTheme } = useTheme(); // Keep theme context

  // Notification toggle state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    // Load saved notification preference
    AsyncStorage.getItem('notifications_enabled').then(val => {
      if (val !== null) setNotificationsEnabled(val === 'true');
    });
  }, []);

  const handleToggleNotifications = useCallback(async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notifications_enabled', String(value));

    if (value) {
      // Re-register for push notifications
      try {
        const { initializePushNotifications } = await import('../../src/lib/notifications_service');
        await initializePushNotifications();
        if (Platform.OS === 'web') {
          alert(t('screens.profile.alerts.notificationsOn'));
        } else {
          Alert.alert('✅', t('screens.profile.alerts.notificationsOn'));
        }
      } catch (e) {
        console.warn('[Profile] Enable notifications error:', e);
      }
    } else {
      // Cancel all scheduled notifications
      try {
        const { cancelAllNotifications } = await import('../../src/lib/notifications_service');
        await cancelAllNotifications();
        // Remove push token from server
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          await supabase.from('push_tokens').delete().eq('user_id', authUser.id);
        }
        if (Platform.OS === 'web') {
          alert(t('screens.profile.alerts.notificationsOff'));
        } else {
          Alert.alert('🔕', t('screens.profile.alerts.notificationsOff'));
        }
      } catch (e) {
        console.warn('[Profile] Disable notifications error:', e);
      }
    }
  }, [t]);

  const handleTestNotification = useCallback(async () => {
    try {
      const { scheduleLocalNotification } = await import('../../src/lib/notifications_service');
      await scheduleLocalNotification(
        '🔔 SOLTO — Тестовое уведомление',
        'Уведомления работают! Вы будете получать оповещения о новых сообщениях, заявках и обновлениях.'
      );
      if (Platform.OS === 'web') {
        alert('Тестовое уведомление отправлено!');
      } else {
        Alert.alert('✅', 'Тестовое уведомление отправлено! Проверьте шторку уведомлений.');
      }
    } catch (e) {
      console.warn('[Profile] Test notification error:', e);
      Alert.alert('Ошибка', 'Не удалось отправить тестовое уведомление. Проверьте разрешения.');
    }
  }, []);

  const roleColor = profile?.role ? ROLE_COLORS[profile.role] || '#64748B' : '#64748B';
  const avatarSource = tempAvatar || profile?.avatar_url;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        {/* Avatar with upload */}
        <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            {avatarSource ? (
              <Image
                source={{ uri: avatarSource }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>
                {name ? name[0].toUpperCase() : profile?.full_name ? profile.full_name[0].toUpperCase() : '?'}
              </Text>
            )}
          </View>
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={16} color={colors.primary} />
          </View>
        </Pressable>

        <Text style={[styles.name, { color: colors.text }]}>
          {profile?.full_name || t('screens.profile.info.notSpecified')}
        </Text>
        {profile?.role && (
          <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
            <Text style={styles.roleText}>
              {t(ROLE_NAMES[profile.role as keyof typeof ROLE_NAMES] || 'screens.profile.roles.guest')}
            </Text>
          </View>
        )}
      </View>

      {/* Title and Edit Button */}
      <View style={styles.section}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('screens.profile.title')}</Text>
          {editing ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setEditing(false)}
                style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 }}
              >
                <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 13 }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdate}
                style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 }}
                disabled={loading}
              >
                {loading ? <ActivityIndicator size="small" color="#16A34A" /> : <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 13 }}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setEditing(true)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>{t('screens.profile.edit')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Role is assigned by invite code and shown as read-only badge above */}
      </View>

      {/* Section: Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>{t('screens.profile.info.title')}</Text>
        </View>

        <View style={styles.infoCard}>
          <InfoItem
            label={t('screens.profile.info.name')}
            value={name}
            editable={editing}
            onChangeText={setName}
            placeholder={t('screens.profile.info.namePlaceholder')}
          />
          <InfoItem
            label={t('screens.profile.info.phone')}
            value={editing ? phone : (phone || t('screens.profile.info.notSpecified'))}
            editable={editing}
            onChangeText={setPhone}
            placeholder="+996 XXX XXX XXX"
          />
          <InfoItem
            label={t('screens.profile.info.email')}
            value={user?.email || ''}
          />
          <InfoItem
            label={t('screens.profile.info.company')}
            value={companyName || t('screens.profile.info.notSpecified')}
          />

          {companyInviteCode && (
            <InfoItem
              label={t('screens.profile.info.inviteCode')}
              value={companyInviteCode}
              showCopy
            />
          )}
        </View>
      </View>

      {/* Team or Join - hidden for suppliers */}
      {profile?.role !== 'supplier' && (
        profile?.company_name ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('screens.profile.info.team')}</Text>
            </View>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/company/team' as any)}>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>{profile.company_name}</Text>
                <Text style={styles.actionSubtitle}>{t('screens.profile.info.manage')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.section, styles.joinCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/auth/invite' as any)}>
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            <View style={styles.joinInfo}>
              <Text style={[styles.joinTitle, { color: colors.text }]}>{t('screens.profile.info.join')}</Text>
              <Text style={[styles.joinSubtitle, { color: colors.textMuted }]}>{t('screens.profile.info.joinSubtitle')}</Text>
            </View>
          </TouchableOpacity>
        )
      )}

      {/* Requisites */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('screens.profile.requisites.title')}</Text>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Company Name (editable for all users) */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('screens.profile.requisites.name')}</Text>
            {editing ? (
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.surface }]}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder={t('screens.profile.requisites.namePlaceholder')}
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={[styles.infoValue, { color: colors.text }]}>{companyName || '—'}</Text>
            )}
          </View>

          {/* INN */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('screens.profile.requisites.inn')}</Text>
            {editing ? (
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.surface }]}
                value={companyInn}
                onChangeText={setCompanyInn}
                placeholder={t('screens.profile.requisites.placeholderInn')}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            ) : (
              <Text style={[styles.infoValue, { color: colors.text }]}>{companyInn || '—'}</Text>
            )}
          </View>

          {/* Address */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('screens.profile.requisites.address')}</Text>
            {editing ? (
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.surface }]}
                value={companyAddress}
                onChangeText={setCompanyAddress}
                placeholder={t('screens.profile.requisites.placeholderAddress')}
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={[styles.infoValue, { color: colors.text }]}>{companyAddress || '—'}</Text>
            )}
          </View>

          {/* Bank */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('screens.profile.requisites.bank')}</Text>
            {editing ? (
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.surface }]}
                value={companyBank}
                onChangeText={setCompanyBank}
                placeholder={t('screens.profile.requisites.placeholderBank')}
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={[styles.infoValue, { color: colors.text }]}>{companyBank || '—'}</Text>
            )}
          </View>

          {/* Account */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('screens.profile.requisites.account')}</Text>
            {editing ? (
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.surface }]}
                value={companyAccount}
                onChangeText={setCompanyAccount}
                placeholder="1234567890123456"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            ) : (
              <Text style={[styles.infoValue, { color: colors.text }]}>{companyAccount || '—'}</Text>
            )}
          </View>
        </View>

        {/* Requisites inputs... */}
      </View>

      {/* Settings Menu */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('screens.profile.settings.title')}</Text>

        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Theme Toggle */}
          <Pressable style={styles.menuRow} onPress={toggleTheme}>
            <Ionicons name={theme === 'dark' ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t('screens.profile.settings.theme')}</Text>
            <Text style={[styles.menuValue, { color: colors.primary }]}>
              {theme === 'dark' ? t('screens.profile.settings.dark') : t('screens.profile.settings.light')}
            </Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Notifications with Switch */}
          <View style={styles.menuRow}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={[styles.menuText, { color: colors.text }]}>
              {t('screens.profile.alerts.notificationsOn').split(' ')[0]}
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={'#fff'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Test Notification Button */}
          <Pressable style={styles.menuRow} onPress={handleTestNotification}>
            <Ionicons name="flask-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t('screens.profile.settings.testNotification')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Language */}
          <View style={styles.menuRow}>
            <Ionicons name="globe-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={[styles.menuText, { color: colors.text, flex: 1 }]}>{t('screens.profile.settings.language')}</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Pressable
                onPress={() => { i18n.changeLanguage('ru'); }}
                style={({ pressed }) => [{
                  paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8,
                  backgroundColor: i18n.language === 'ru' ? colors.primary : 'transparent',
                  borderWidth: 1, borderColor: i18n.language === 'ru' ? colors.primary : colors.border,
                }, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Русский язык"
              >
                <Text style={{ color: i18n.language === 'ru' ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>RU</Text>
              </Pressable>
              <Pressable
                onPress={() => { i18n.changeLanguage('en'); }}
                style={({ pressed }) => [{
                  paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8,
                  backgroundColor: i18n.language === 'en' ? colors.primary : 'transparent',
                  borderWidth: 1, borderColor: i18n.language === 'en' ? colors.primary : colors.border,
                }, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="English language"
              >
                <Text style={{ color: i18n.language === 'en' ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>EN</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Help */}
          <Pressable style={styles.menuRow} onPress={() => router.push({ pathname: '/legal', params: { tab: 'about' } } as any)}>
            <Ionicons name="help-circle-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t('screens.profile.help.title')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* About App */}
          <Pressable style={styles.menuRow} onPress={() => router.push({ pathname: '/legal', params: { tab: 'about' } } as any)}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t('screens.profile.help.about')}</Text>
            <Text style={[styles.menuValue, { color: colors.textSecondary }]}>v1.0.4</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Terms of Service */}
          <Pressable style={styles.menuRow} onPress={() => router.push({ pathname: '/legal', params: { tab: 'terms' } } as any)}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t('screens.profile.help.terms')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Privacy Policy */}
          <Pressable style={styles.menuRow} onPress={() => router.push({ pathname: '/legal', params: { tab: 'privacy' } } as any)}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={[styles.menuText, { color: colors.text }]}>{t('screens.profile.help.privacy')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        {editing && (
          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled, { marginBottom: 20, backgroundColor: '#10B981' }]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        )}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('screens.profile.logout')}</Text>
        </Pressable>

        {/* Delete Account */}
        <Pressable
          style={[styles.logoutBtn, { backgroundColor: '#FEE2E2', marginTop: 12 }]}
          onPress={() => {
            const confirmDelete = async () => {
              try {
                setLoading(true);
                // Call edge function to delete user
                const { error } = await supabase.rpc('delete_user_account');
                if (error) throw error;
                await supabase.auth.signOut();
                router.replace('/auth/login');
              } catch (err: any) {
                console.error('Delete account error:', err);
                const msg = err?.message || 'Ошибка удаления аккаунта';
                if (Platform.OS === 'web') { alert(msg); } else { Alert.alert(t('common.error'), msg); }
              } finally {
                setLoading(false);
              }
            };

            if (Platform.OS === 'web') {
              if (window.confirm('Вы уверены что хотите удалить аккаунт? Это действие необратимо!')) {
                confirmDelete();
              }
            } else {
              Alert.alert(
                'Удалить аккаунт?',
                'Это действие необратимо. Все ваши данные будут удалены.',
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: 'Удалить', onPress: confirmDelete, style: 'destructive' }
                ]
              );
            }
          }}
        >
          <Text style={[styles.logoutText, { color: '#DC2626' }]}>Удалить аккаунт</Text>
        </Pressable>
      </View>

      {/* Version */}
      <Text style={[styles.version, { color: colors.textSecondary }]}>SOLTO v1.0.4</Text>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: UI.bg,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: UI.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: UI.border,
  },
  avatarBadgeIcon: {
    fontSize: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: UI.bg,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 0,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: UI.textSecondary,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: UI.text,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: UI.blueBg,
    borderRadius: 8,
  },
  editButtonText: {
    color: UI.blue,
    fontWeight: '600',
    fontSize: 14,
  },
  roleHeader: {
    marginTop: 8,
    padding: 12,
    backgroundColor: UI.bgSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
  },
  roleLabel: {
    fontSize: 12,
    color: UI.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: UI.bg,
    borderWidth: 2,
    borderColor: UI.border,
    minWidth: 100,
    alignItems: 'center',
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: UI.text,
  },
  roleValue: {
    fontSize: 16,
    fontWeight: '600',
    color: UI.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: UI.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: UI.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: UI.textSecondary,
  },
  joinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  joinInfo: {
    marginLeft: 12,
    flex: 1,
  },
  joinTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  joinSubtitle: {
    fontSize: 13,
  },
  infoCard: {
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  infoLabel: {
    fontSize: 15,
    width: 100,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  saveBtn: {
    backgroundColor: UI.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  menuCard: {
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
  },
  menuValue: {
    fontSize: 14,
    marginRight: 8,
  },
  menuArrow: {
    fontSize: 20,
    color: UI.textMuted,
  },
  logoutBtn: {
    backgroundColor: UI.errorBg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI.error,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: UI.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
