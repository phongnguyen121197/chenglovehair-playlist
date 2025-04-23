const { createClient } = require('@supabase/supabase-js');

// Khởi tạo Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async function(event, context) {
  try {
    // Kiểm tra method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
      };
    }
    
    // Parse body
    const { id, status } = JSON.parse(event.body);
    
    if (!id || !status || !['approved', 'rejected'].includes(status)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'ID và trạng thái không hợp lệ' })
      };
    }
    
    // Cập nhật trạng thái
    const { data, error } = await supabase
      .from('songs')
      .update({ status: status })
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: status === 'approved' ? 'Bài hát đã được phê duyệt' : 'Bài hát đã bị từ chối'
      })
    };
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái bài hát:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message || 'Đã xảy ra lỗi khi cập nhật dữ liệu' })
    };
  }
};